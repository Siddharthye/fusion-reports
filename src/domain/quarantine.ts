import { distanceInMetres } from './geo'
import { tokenize } from './text'
import type { FlagStatus, Incident, Report } from './types'

/**
 * Joke-signal tokens. Deliberately fantasy-and-slang heavy and deliberately
 * NOT profanity: a genuinely panicking student may well swear, but nobody
 * reporting a real fire writes "lol jk". Every hit is echoed back in the
 * flag reason, so reviewers can see exactly which word tripped the wire.
 */
const JOKE_LEXICON = new Set([
  'lol', 'lolol', 'lmao', 'lmfao', 'rofl', 'jk', 'kidding', 'joke', 'jokes',
  'prank', 'pranked', 'haha', 'hahaha', 'hehe', 'xd', 'bruh', 'meme', 'troll',
  'dragon', 'dragons', 'alien', 'aliens', 'zombie', 'zombies', 'unicorn',
  'godzilla', 'rickroll', 'sus',
])

/** Prior solo, never-corroborated reports before a reporter loses the benefit of the doubt. */
const SOLO_HISTORY_LIMIT = 3
/** The dead-of-night window (campus-local hours) where lone reports earn a watch flag. */
const NIGHT_START_HOUR = 1
const NIGHT_END_HOUR = 5
/** "Nearby corroboration" means another report inside this radius… */
const NEARBY_M = 250
/** …within this many minutes before the candidate. */
const CORROBORATION_LOOKBACK_MS = 10 * 60_000

/** Everything quarantine needs to judge a report before it may cluster. */
export interface QuarantineContext {
  history: readonly Report[]
  incidents: readonly Incident[]
  now: Date
}

export interface FlagAssessment {
  status: FlagStatus
  reasons: string[]
}

type CandidateReport = Pick<Report, 'text' | 'location' | 'reporterToken' | 'at'>

/**
 * Joke-lexicon tokens present in a text, for auditable flag reasons.
 *
 * @example
 * lexiconHits('lol jk there is a dragon on the roof') // => ['lol', 'jk', 'dragon']
 */
export function lexiconHits(text: string): string[] {
  return tokenize(text).filter((token) => JOKE_LEXICON.has(token))
}

/** Prior reports by this token that founded an incident nobody else ever joined. */
function countSoloUncorroborated(reporterToken: string, context: QuarantineContext): number {
  const incidentSize = new Map(
    context.incidents.map((incident) => [incident.id, incident.reportIds.length]),
  )

  return context.history.filter(
    (report) =>
      report.reporterToken === reporterToken &&
      report.flag !== 'quarantined' &&
      report.incidentId !== null &&
      incidentSize.get(report.incidentId) === 1,
  ).length
}

/** True when a 01:00–05:00 report has no other report within 250m in the last 10 min. */
function isLoneNightReport(candidate: CandidateReport, context: QuarantineContext): boolean {
  // Server clock is assumed campus-local; ops deployments pin TZ accordingly.
  const hour = new Date(candidate.at).getHours()
  if (hour < NIGHT_START_HOUR || hour >= NIGHT_END_HOUR) return false

  const candidateMs = new Date(candidate.at).getTime()
  const corroborated = context.history.some((report) => {
    if (report.flag === 'quarantined') return false
    const deltaMs = candidateMs - new Date(report.at).getTime()
    if (deltaMs < 0 || deltaMs > CORROBORATION_LOOKBACK_MS) return false
    return distanceInMetres(report.location, candidate.location) <= NEARBY_M
  })

  return !corroborated
}

/**
 * Judges a report BEFORE clustering. Quarantined reports never surface as
 * incidents — they sit in the review lane. Watch reports join normally but
 * stay marked, because suppressing a possibly-real emergency is worse than
 * asking a human to glance at it.
 *
 * @example
 * assessReport({ text: 'lol jk dragon attack', ... }, { history, incidents, now })
 * // => { status: 'quarantined', reasons: ['joke lexicon: lol, jk, dragon'] }
 */
export function assessReport(
  candidate: CandidateReport,
  context: QuarantineContext,
): FlagAssessment {
  const hits = lexiconHits(candidate.text)
  if (hits.length > 0) {
    return { status: 'quarantined', reasons: [`joke lexicon: ${hits.join(', ')}`] }
  }

  const soloCount = countSoloUncorroborated(candidate.reporterToken, context)
  if (soloCount >= SOLO_HISTORY_LIMIT) {
    return {
      status: 'quarantined',
      reasons: [`reporter has ${soloCount} prior solo reports nobody ever corroborated`],
    }
  }

  if (isLoneNightReport(candidate, context)) {
    return {
      status: 'watch',
      reasons: ['lone 01:00–05:00 report with no nearby corroboration in the last 10 min'],
    }
  }

  return { status: 'clear', reasons: [] }
}
