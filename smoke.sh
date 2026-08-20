#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# FUSION smoke suite — exercises every endpoint against a running instance.
#
#   npm run dev          # in one terminal
#   bash smoke.sh        # in another (or: bash smoke.sh http://host:port)
#
# Doubles as living documentation: each check shows the exact request a buyer
# would make and the invariant they can rely on. Prints PASS/FAIL per check
# and exits non-zero if anything failed. Needs only bash + curl.
# ─────────────────────────────────────────────────────────────────────────────
set -u

BASE="${1:-http://localhost:4104}"
PASS=0
FAIL=0

check() { # check <name> <haystack> <needle>
  local name="$1" haystack="$2" needle="$3"
  if printf '%s' "$haystack" | grep -q "$needle"; then
    printf 'PASS  %s\n' "$name"
    PASS=$((PASS + 1))
  else
    printf 'FAIL  %s\n      wanted: %s\n      got:    %.220s\n' "$name" "$needle" "$haystack"
    FAIL=$((FAIL + 1))
  fi
}

extract_incident_id() { # first "incidentId":"…" in a JSON body
  printf '%s' "$1" | sed -n 's/.*"incidentId":"\([^"]*\)".*/\1/p' | head -n 1
}

# Random coordinates far from the demo campus, so re-running the suite founds
# a fresh incident every time instead of corroborating a previous run's.
LAT="$((10 + RANDOM % 40)).$((1000 + RANDOM % 8999))"
LNG="$((70 + RANDOM % 20)).$((1000 + RANDOM % 8999))"

echo "── FUSION smoke @ $BASE (test site: $LAT,$LNG) ──"

# 1 · health
BODY=$(curl -s "$BASE/api/health")
check "GET  /api/health is ok" "$BODY" '"status":"ok"'

# 2 · stats exposes the headline dedup ratio
BODY=$(curl -s "$BASE/api/stats")
check "GET  /api/stats has dedupRatio" "$BODY" '"dedupRatio"'
check "GET  /api/stats names its storage" "$BODY" '"storageBackend"'

# 3 · a first report founds a new incident
BODY=$(curl -s -X POST "$BASE/api/reports" -H 'Content-Type: application/json' \
  -d "{\"text\":\"chemical smell in the west lab wing\",\"lat\":$LAT,\"lng\":$LNG,\"category\":\"infrastructure\",\"reporterToken\":\"smoke-a\"}")
check "POST /api/reports founds an incident" "$BODY" '"isNew":true'
INCIDENT_ID=$(extract_incident_id "$BODY")

# 4 · a similar nearby report corroborates it instead of duplicating
BODY=$(curl -s -X POST "$BASE/api/reports" -H 'Content-Type: application/json' \
  -d "{\"text\":\"strong chemical smell near the west lab\",\"lat\":$LAT,\"lng\":$LNG,\"category\":\"infrastructure\",\"reporterToken\":\"smoke-b\"}")
check "POST /api/reports dedupes the second report" "$BODY" '"isNew":false'
check "POST /api/reports joins the SAME incident" "$BODY" "\"incidentId\":\"$INCIDENT_ID\""
check "POST /api/reports counts both reports" "$BODY" '"corroborationCount":2'

# 5 · incident listing and detail
BODY=$(curl -s "$BASE/api/incidents")
check "GET  /api/incidents lists the incident" "$BODY" "$INCIDENT_ID"
BODY=$(curl -s "$BASE/api/incidents?status=resolved")
check "GET  /api/incidents?status= filters" "$BODY" '"status":"resolved"'
BODY=$(curl -s "$BASE/api/incidents/$INCIDENT_ID")
check "GET  /api/incidents/:id returns members" "$BODY" 'chemical smell in the west lab wing'
BODY=$(curl -s "$BASE/api/incidents/does-not-exist")
check "GET  /api/incidents/:id 404s cleanly" "$BODY" '"error"'

# 6 · an obvious prank is quarantined, never becoming an incident
BODY=$(curl -s -X POST "$BASE/api/reports" -H 'Content-Type: application/json' \
  -d "{\"text\":\"lol jk a dragon is attacking the lab\",\"lat\":$LAT,\"lng\":$LNG,\"category\":\"other\",\"reporterToken\":\"smoke-prank\"}")
check "POST /api/reports quarantines a prank" "$BODY" '"quarantined":true'
check "POST /api/reports names the lexicon hits" "$BODY" 'joke lexicon'

# 7 · the quarantine lane shows it, with reasons
BODY=$(curl -s "$BASE/api/flags")
check "GET  /api/flags shows the prank" "$BODY" 'dragon is attacking the lab'

# 8 · validation failures come back as readable 400s
BODY=$(curl -s -X POST "$BASE/api/reports" -H 'Content-Type: application/json' -d '{"text":"hi"}')
check "POST /api/reports rejects bad input" "$BODY" '"error":"Validation failed"'

# 9 · the demo storm: 21 reports through the real pipeline (instant mode)
BODY=$(curl -s -X POST "$BASE/api/demo/storm" -H 'Content-Type: application/json' \
  -d '{"scenario":"fire","pace":false}')
check "POST /api/demo/storm submits 21 reports" "$BODY" '"submitted":21'
check "POST /api/demo/storm quarantines its prank" "$BODY" '"quarantined":1'
check "POST /api/demo/storm fuses to one incident" "$BODY" '"incidentId":"'

# 10 · the SSE stream opens and announces its retry policy
BODY=$(curl -s -N --max-time 3 "$BASE/api/events" || true)
check "GET  /api/events streams (retry frame)" "$BODY" 'retry:'

echo "──"
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
