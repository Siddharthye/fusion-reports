# FUSION — Duplicate Report Fusion & Corroboration Engine

**Fifty people report one fire. Your ops screen shows ONE incident at 96% corroboration — not fifty rows of noise.**

Any product that accepts user reports has this problem: civic complaint portals, moderation queues, customer feedback, logistics exception desks, campus emergency response. FUSION is the missing middle layer — a drop-in REST + SSE service that turns a raw report firehose into deduplicated, confidence-scored, auto-escalated incidents, with prank and bad-actor quarantine built in.

Part of the **AEGIS** campus emergency response family (SIREN · ATLAS · FUSION · SENTINEL · BEACON · PULSE). Runs standalone; sells standalone.

---

## 60-second quickstart

```bash
npm install
npm run dev          # → http://localhost:4104, seeded and alive
```

Then fire the demo storm and watch 21 raw reports fuse into a single climbing incident:

```bash
curl -X POST http://localhost:4104/api/demo/storm \
  -H 'Content-Type: application/json' -d '{ "scenario": "fire" }'
```

Open **http://localhost:4104** while it runs: reports scroll down the right-hand ticker, one incident card forms on the left, its confidence bar climbs from ~30% to ~96%, velocity forces it to P0, and the one prank in the storm bounces into the quarantine lane. That is the whole product in 30 seconds.

No database, no API key, no configuration. `bash smoke.sh` exercises every endpoint and prints PASS/FAIL per check.

---

## API

Base URL `http://localhost:4104`. All routes are CORS-open. Errors are always `{ "error": string, "details"?: [...] }`.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/reports` | Ingest one report. Runs quarantine → cluster → confidence → velocity. Returns `{ reportId, incidentId, isNew, corroborationCount, confidence, severity, quarantined, flag, flagReasons }`. Status: **201** founded a new incident, **200** corroborated an existing one, **202** quarantined. |
| `GET` | `/api/incidents?status=active\|resolved` | Fused incidents with computed fields (confidence, centroid, reporterCount, velocity), most recently touched first. |
| `GET` | `/api/incidents/:id` | One incident plus its full member reports in arrival order. |
| `GET` | `/api/flags` | The review lane: quarantined + watch reports with human-readable reasons. |
| `GET` | `/api/events` | Server-sent events: `incident.created`, `incident.updated`, `report.quarantined`. Resumable (see architecture notes). |
| `POST` | `/api/demo/storm` | `{ scenario?: "fire"\|"medical"\|"harassment", pace?: boolean }` — ~20 varied phrasings of one event + 1 prank through the **real** pipeline. `pace: true` (default) drips them over ~30s for a watchable demo; `pace: false` back-dates them over ~90s and returns immediately. Empty body works. |
| `GET` | `/api/stats` | `{ reports, acceptedReports, incidents, activeIncidents, avgConfidence, quarantined, watch, dedupRatio, storageBackend }`. |
| `GET` | `/api/health` | Liveness probe. |

### Submit a report

```bash
curl -X POST http://localhost:4104/api/reports \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Fire in Block C, smoke on the second floor",
    "lat": 20.3536, "lng": 85.81893,
    "category": "fire",
    "reporterToken": "device-4471"
  }'
```

`category` ∈ `fire | medical | security | harassment | infrastructure | other` (defaults to `other`). `reporterToken` is any opaque per-user/per-device string — distinct tokens are what make corroboration real. Optional `at` (ISO timestamp) lets you replay historical queues through the pipeline.

---

## Embedding

**Iframe** (any stack — Flask, Django, plain HTML):

```html
<iframe src="http://localhost:4104/widget"
        style="border:0;width:100%;height:640px"></iframe>
```

**React** — copy the single self-contained file `src/components/embed/FusionEmbed.tsx` into your app (no dependencies beyond React, inline-styled, CORS already open):

```tsx
import { FusionEmbed } from './FusionEmbed'

<FusionEmbed baseUrl="http://localhost:4104" maxIncidents={5} />
```

**Any language, live** — the SSE stream is plain HTTP:

```js
const stream = new EventSource('http://localhost:4104/api/events')
stream.addEventListener('incident.updated', (e) => console.log(JSON.parse(e.data)))
```

---

## The math (documented because it is the product)

All of this lives as pure, framework-free functions in `src/domain/` — no I/O, every export JSDoc'd with an example.

### Clustering (`domain/cluster.ts`)

An incoming report is scored against every **active** incident:

```
raw      = 0.45·spatial + 0.30·semantic + 0.25·temporal
combined = same category    → min(1, raw + 0.15)
           different category → raw × 0.55
join if  combined ≥ 0.5     (FUSION_JOIN_THRESHOLD)
```

- **spatial** — haversine distance to the incident centroid: full credit ≤ 60m, zero credit ≥ 250m, linear between. Beyond 250m is a **hard veto**: however similar the words, a report 300m away describes a different place.
- **temporal** — distance from the incident's last report: full ≤ 5 min, zero ≥ 45 min.
- **semantic** — token-set cosine over stopword-filtered tokens, taken as the *best* match against recent member reports (one member phrased like the newcomer beats a diluted average over fifty). `"fire in block c"` vs `"block c is on fire"` scores 1.0.
- **category** — a strong prior: matching categories get +0.15; mismatched ones are scaled by 0.55, so only overwhelming text-plus-space evidence merges a `fire` report into a `medical` incident.

No match above threshold → the report founds a new incident.

### Confidence (`domain/confidence.ts`)

```
confidence = 0.5·reporters + 0.25·tightness + 0.25·density   (clamped to 0.05–0.97)
```

- **reporters** — log-scaled distinct `reporterToken` count (1→0.23, 5→0.59, 16→0.93). Fifty reports from one prankster count once.
- **tightness** — mean member distance to the centroid (≤30m → 1). A single report scores an agnostic 0.5, not a perfect 1.
- **density** — reports per minute over the active window, saturating at 4 rpm.

Recomputed on every join, so the number **climbs live** — the 0.97 ceiling exists because corroboration is evidence, never proof.

### Velocity escalation (`domain/velocity.ts`)

≥3 reports in 2 minutes bumps priority one level; ≥8 forces **P0**. Escalation latches — standing an emergency down is a human judgement, not arithmetic. The reason string (`"9 reports in 2 min — critical surge, forced P0"`) is stored on the incident.

### Quarantine (`domain/quarantine.ts`)

Runs **before** clustering, so junk never touches an incident:

| Rule | Outcome |
| --- | --- |
| Joke-lexicon token hit (`lol`, `jk`, `dragon`, …) | `quarantined` — never becomes an incident; sits in the review lane with the exact tokens that tripped it |
| Reporter with ≥3 prior solo reports nobody ever corroborated | `quarantined` — crying wolf costs the benefit of the doubt |
| Lone 01:00–05:00 report, zero nearby corroboration within 10 min | `watch` — joins normally but stays marked, because suppressing a possibly-real emergency is worse than asking a human to glance |

---

## Architecture notes

- **Storage adapter** (`src/store/`) — one interface, two implementations: a zero-setup in-memory store with best-effort JSON persistence to `.data/` (the default), and Upstash Redis, selected automatically when `UPSTASH_REDIS_REST_URL`/`TOKEN` are set. Swapping storage is an environment variable, not a code change.
- **Serverless-safe SSE** (`src/app/api/events/route.ts`) — streams deliberately self-rotate at ~50s, just under typical serverless function limits. `EventSource` reconnects on its own and replays the `Last-Event-ID` header against the store's append-only cursor-indexed event log, so a rotation is invisible to clients and loses no events. No websockets, no sticky sessions, nothing to configure.
- **Lazy, honest seeding** — demo data (2 resolved incidents, 1 active medium-confidence incident, 1 watch report, 1 quarantined prank) is written on first store read, and its derived fields are computed by the same domain functions used at runtime. A fresh clone opens onto a living product with every UI lane populated.
- **Thin routes, pure core** — every route is a few lines over `src/lib/fusion-service.ts`; every decision (join or found, quarantine or clear, escalate or hold) is a pure function in `src/domain/` you can unit-test or lift into another runtime wholesale.
- **The demo is real** — `/api/demo/storm` goes through `submitReport` like any human report. Nothing on the console is mocked.

## Why this is hard to rebuild

1. **The scoring blend is tuned, not typed.** Anyone can write a haversine; the value is in the weights, the falloff radii, the category prior/penalty asymmetry, and the hard spatial veto — the difference between "50 reports → 1 incident" and "50 reports → 7 incidents plus one incident containing a fire and a nosebleed". That tuning is validated end-to-end by the storm scenarios and smoke suite you're buying.
2. **Confidence that provably climbs.** Naive corroboration formulas either saturate after 3 reports or never reach 90%. The log-scaled reporter curve, agnostic single-point tightness, and density floor were shaped so evidence accumulates visibly and asymptotically — which is a demo property, a UX property, and a trust property at once.
3. **Trust machinery nobody remembers to build.** Reporter-history tracking, lone-night-report watch flags, and an auditable quarantine lane (every flag carries its reason) are the unglamorous 40% of this codebase that every report-ingesting product ends up needing after their first prank wave — here it's done, wired before clustering so junk never pollutes an incident.
4. **Serverless-safe live updates.** The 50s self-rotating SSE + cursor-resume pattern survives Vercel-class function limits with zero client code. Getting this wrong looks fine locally and silently drops events in production.
5. **It's a sealed unit.** Storage adapter, seeded demo, smoke suite, iframe widget, copy-paste React embed, zero runtime network dependencies. Integration is an afternoon; rebuilding is a sprint you'd rather spend on your actual product.

## Project layout

```
src/domain/     pure fusion logic — cluster, confidence, velocity, quarantine, incident lifecycle
src/lib/        service orchestration, zod schemas, config, seed + storm data
src/store/      storage adapter (memory ⇄ Upstash Redis)
src/app/        thin API routes + console (/) + widget (/widget)
src/components/ console UI; embed/ holds the copy-paste React component
src/hooks/      SSE client hook shared by console and widget
smoke.sh        every endpoint, PASS/FAIL per check
```
