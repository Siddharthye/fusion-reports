const readNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Tunables, all overridable from `.env`. Defaults are chosen so that a fresh
 * clone behaves sensibly with no configuration at all.
 */
export const config = {
  /** Minimum combined affinity for a report to join an existing incident. */
  joinThreshold: readNumber(process.env.FUSION_JOIN_THRESHOLD, 0.5),

  /** Milliseconds between reports during a paced demo storm (~30s total). */
  stormPaceMs: readNumber(process.env.FUSION_STORM_PACE_MS, 1500),

  /** Centre of the seeded demo campus (KIIT Campus 25, Bhubaneswar). */
  campusCentre: {
    lat: readNumber(process.env.FUSION_CAMPUS_LAT, 20.3536),
    lng: readNumber(process.env.FUSION_CAMPUS_LNG, 85.8195),
  },
} as const
