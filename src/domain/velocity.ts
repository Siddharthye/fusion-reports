import type { Severity } from './types'

/** The burst window: how recently reports must have arrived to count. */
export const VELOCITY_WINDOW_MS = 2 * 60_000
/** Reports inside the window that bump priority one level. */
export const BUMP_AT = 3
/** Reports inside the window that force P0 outright. */
export const CRITICAL_AT = 8

const LADDER: readonly Severity[] = ['P3', 'P2', 'P1', 'P0']

/** Small forward tolerance absorbs clock skew between reporter devices. */
const CLOCK_SKEW_MS = 1_000

/**
 * One rung up the severity ladder; P0 has nowhere higher to go.
 *
 * @example
 * bumpSeverity('P2') // => 'P1'
 */
export function bumpSeverity(severity: Severity): Severity {
  const index = LADDER.indexOf(severity)
  return LADDER[Math.min(index + 1, LADDER.length - 1)]
}

export interface VelocityResult {
  priority: Severity
  reason: string | null
}

/**
 * Escalation from report VELOCITY alone. Many people reporting at once is
 * itself information — it arrives before any human has assessed anything, so
 * the queue should reorder before anyone reads a word.
 *
 * @example
 * velocityEscalation(nineRecentTimestamps, 'P1', new Date())
 * // => { priority: 'P0', reason: '9 reports in 2 min — critical surge, forced P0' }
 */
export function velocityEscalation(
  reportTimes: readonly string[],
  base: Severity,
  now: Date,
): VelocityResult {
  const cutoff = now.getTime() - VELOCITY_WINDOW_MS
  const recent = reportTimes.filter((iso) => {
    const ms = new Date(iso).getTime()
    return ms >= cutoff && ms <= now.getTime() + CLOCK_SKEW_MS
  }).length

  if (recent >= CRITICAL_AT) {
    return { priority: 'P0', reason: `${recent} reports in 2 min — critical surge, forced P0` }
  }

  if (recent >= BUMP_AT) {
    const bumped = bumpSeverity(base)
    // Already at the top: nothing changed, so nothing to explain.
    if (bumped === base) return { priority: base, reason: null }
    return { priority: bumped, reason: `${recent} reports in 2 min — bumped ${base} → ${bumped}` }
  }

  return { priority: base, reason: null }
}
