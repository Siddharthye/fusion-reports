import { distanceInMetres } from './geo'
import { tokenize, tokenSetCosine } from './text'
import type { Incident, Report } from './types'

/** Reports this close to an incident's centroid get full spatial credit. */
export const SPATIAL_FULL_M = 60
/** Beyond this a report can NEVER join — different place, different incident. */
export const SPATIAL_ZERO_M = 250
/** Full temporal credit within 5 minutes of the incident's last report… */
export const TEMPORAL_FULL_MS = 5 * 60_000
/** …fading to zero credit at 45 minutes. */
export const TEMPORAL_ZERO_MS = 45 * 60_000
/** Minimum combined affinity for a report to join an existing incident. */
export const JOIN_THRESHOLD = 0.5

/**
 * Relative weight of each signal. Space dominates because two events in the
 * same minute with similar words 200m apart are usually two events, while two
 * differently-worded reports at one spot at one time rarely are.
 */
const WEIGHTS = { spatial: 0.45, semantic: 0.3, temporal: 0.25 } as const

/** A matching category adds a flat prior on top of the blend… */
const CATEGORY_PRIOR = 0.15
/**
 * …while a mismatch scales the whole score down, so only overwhelming
 * text-plus-space evidence can merge a "fire" report into a "medical" incident.
 */
const CATEGORY_MISMATCH_PENALTY = 0.55

/** The fields the clusterer needs — accepted before the report has an id. */
export type IncomingReport = Pick<Report, 'text' | 'category' | 'location' | 'at'>

export interface AffinityBreakdown {
  spatial: number
  temporal: number
  semantic: number
  sameCategory: boolean
  combined: number
}

export interface CandidateMatch {
  incident: Incident
  affinity: AffinityBreakdown
}

/**
 * Spatial affinity: 1 inside SPATIAL_FULL_M, 0 beyond SPATIAL_ZERO_M,
 * linear in between.
 *
 * @example
 * spatialAffinity(155) // => 0.5
 */
export function spatialAffinity(distanceM: number): number {
  if (distanceM <= SPATIAL_FULL_M) return 1
  if (distanceM >= SPATIAL_ZERO_M) return 0
  return 1 - (distanceM - SPATIAL_FULL_M) / (SPATIAL_ZERO_M - SPATIAL_FULL_M)
}

/**
 * Temporal affinity: 1 within TEMPORAL_FULL_MS of the incident's last report,
 * 0 beyond TEMPORAL_ZERO_MS, linear in between.
 *
 * @example
 * temporalAffinity(25 * 60_000) // => 0.5
 */
export function temporalAffinity(deltaMs: number): number {
  if (deltaMs <= TEMPORAL_FULL_MS) return 1
  if (deltaMs >= TEMPORAL_ZERO_MS) return 0
  return 1 - (deltaMs - TEMPORAL_FULL_MS) / (TEMPORAL_ZERO_MS - TEMPORAL_FULL_MS)
}

/**
 * Blended affinity between one report and one incident, with the working shown.
 *
 * Semantic similarity is the BEST token-set cosine against recent member
 * reports rather than a pooled bag of words: one member phrased like the
 * newcomer is stronger evidence than a diluted average over fifty.
 *
 * @example
 * affinityScore(report, incident, members)
 * // => { spatial: 1, temporal: 1, semantic: 0.63, sameCategory: true, combined: 1 }
 */
export function affinityScore(
  report: IncomingReport,
  incident: Incident,
  members: readonly Report[],
): AffinityBreakdown {
  const spatial = spatialAffinity(distanceInMetres(report.location, incident.centroid))
  const temporal = temporalAffinity(
    Math.abs(new Date(report.at).getTime() - new Date(incident.lastReportAt).getTime()),
  )

  const tokens = tokenize(report.text)
  const semantic = members
    .slice(-8)
    .reduce((best, member) => Math.max(best, tokenSetCosine(tokens, tokenize(member.text))), 0)

  const sameCategory = report.category === incident.category

  // Beyond the hard radius nothing else matters: however similar the words,
  // a report 300m away is describing a different place.
  if (spatial === 0) return { spatial, temporal, semantic, sameCategory, combined: 0 }

  const raw =
    WEIGHTS.spatial * spatial + WEIGHTS.semantic * semantic + WEIGHTS.temporal * temporal
  const combined = sameCategory
    ? Math.min(1, raw + CATEGORY_PRIOR)
    : raw * CATEGORY_MISMATCH_PENALTY

  return { spatial, temporal, semantic, sameCategory, combined }
}

/**
 * The incident this report should join — the best-scoring ACTIVE incident at
 * or above `threshold` — or `null`, meaning the report founds a new incident.
 *
 * @example
 * selectIncident(report, incidents, membersByIncident)
 * // => { incident, affinity: { combined: 0.82, ... } } | null
 */
export function selectIncident(
  report: IncomingReport,
  incidents: readonly Incident[],
  membersByIncident: ReadonlyMap<string, readonly Report[]>,
  threshold: number = JOIN_THRESHOLD,
): CandidateMatch | null {
  let best: CandidateMatch | null = null

  for (const incident of incidents) {
    if (incident.status !== 'active') continue

    const affinity = affinityScore(report, incident, membersByIncident.get(incident.id) ?? [])
    if (affinity.combined >= threshold && (best === null || affinity.combined > best.affinity.combined)) {
      best = { incident, affinity }
    }
  }

  return best
}
