import { meanDistanceToCentroid } from './geo'
import type { Coordinates, Report } from './types'

/**
 * Distinct reporters at which the reporter signal saturates. Log-scaling means
 * the difference between 1 and 5 reporters is huge while 40 vs 50 is noise —
 * exactly how a dispatcher's gut works.
 */
const REPORTER_SATURATION = 20
/** Mean spread at or under which reports read as "one physical spot". */
const TIGHTNESS_FULL_M = 30
/** Spread at which spatial agreement stops contributing at all. */
const TIGHTNESS_ZERO_M = 250
/** Reports-per-minute at which temporal density saturates. */
const DENSITY_SATURATION_RPM = 4
/** Sub-minute incidents are measured over a 1-minute floor to avoid ∞ rpm. */
const MIN_WINDOW_MS = 60_000

const WEIGHTS = { reporters: 0.5, tightness: 0.25, density: 0.25 } as const

/** Corroboration is evidence, never proof — the ceiling keeps the UI honest. */
const CONFIDENCE_CEILING = 0.97
const CONFIDENCE_FLOOR = 0.05

/**
 * Log-scaled score for how many DISTINCT people reported this.
 *
 * @example
 * reporterScore(1)  // => 0.23
 * reporterScore(16) // => 0.93
 */
export function reporterScore(distinctReporters: number): number {
  if (distinctReporters <= 0) return 0
  return Math.min(1, Math.log1p(distinctReporters) / Math.log1p(REPORTER_SATURATION))
}

/**
 * How tightly the reports agree on WHERE. A single point has no measurable
 * spread, so it scores a deliberately agnostic 0.5 rather than a perfect 1.
 *
 * @example
 * tightnessScore([{ lat: 20.3536, lng: 85.8195 }, { lat: 20.3537, lng: 85.8196 }])
 * // => 1
 */
export function tightnessScore(points: readonly Coordinates[]): number {
  if (points.length < 2) return 0.5

  const mean = meanDistanceToCentroid(points)
  if (mean <= TIGHTNESS_FULL_M) return 1
  if (mean >= TIGHTNESS_ZERO_M) return 0
  return 1 - (mean - TIGHTNESS_FULL_M) / (TIGHTNESS_ZERO_M - TIGHTNESS_FULL_M)
}

/**
 * Reports-per-minute over the incident's active window, saturating at
 * DENSITY_SATURATION_RPM. A burst of reports in one minute is a very different
 * situation from the same count trickling in over an hour.
 *
 * @example
 * densityScore(['2026-01-01T10:00:00Z', '2026-01-01T10:00:30Z']) // => 0.5
 */
export function densityScore(timestamps: readonly string[]): number {
  if (timestamps.length === 0) return 0

  const times = timestamps.map((iso) => new Date(iso).getTime())
  const windowMs = Math.max(MIN_WINDOW_MS, Math.max(...times) - Math.min(...times))
  const reportsPerMinute = timestamps.length / (windowMs / 60_000)

  return Math.min(1, reportsPerMinute / DENSITY_SATURATION_RPM)
}

/**
 * Corroboration confidence in 0..1, blended from who (distinct reporters),
 * where (spatial tightness) and when (temporal density). Recomputed on every
 * join, so the number visibly climbs as reports arrive — that climb IS the
 * product demo.
 *
 * @example
 * corroborationConfidence(reports) // => 0.96
 */
export function corroborationConfidence(reports: readonly Report[]): number {
  if (reports.length === 0) return 0

  const distinct = new Set(reports.map((report) => report.reporterToken)).size
  const combined =
    WEIGHTS.reporters * reporterScore(distinct) +
    WEIGHTS.tightness * tightnessScore(reports.map((report) => report.location)) +
    WEIGHTS.density * densityScore(reports.map((report) => report.at))

  return Math.min(CONFIDENCE_CEILING, Math.max(CONFIDENCE_FLOOR, combined))
}
