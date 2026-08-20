/**
 * Core vocabulary for FUSION. Everything in `domain/` is pure data and pure
 * functions — no I/O, no framework imports — so the fusion logic (the part
 * being sold) reads as a standalone library.
 */

/** Incident priority. P0 is life-threatening; P3 is informational. */
export type Severity = 'P0' | 'P1' | 'P2' | 'P3'

/** Report subject areas. Category is a strong clustering prior — see `cluster.ts`. */
export type Category = 'fire' | 'medical' | 'security' | 'harassment' | 'infrastructure' | 'other'

export interface Coordinates {
  lat: number
  lng: number
}

/** Trust flag attached by quarantine BEFORE a report may join an incident. */
export type FlagStatus = 'clear' | 'watch' | 'quarantined'

export interface Report {
  id: string
  text: string
  category: Category
  location: Coordinates
  /**
   * Opaque per-device/per-user token. Distinct tokens are what make
   * corroboration real: fifty reports from one prankster count once.
   */
  reporterToken: string
  at: string
  /** `null` while quarantined — such reports never surface as incidents. */
  incidentId: string | null
  flag: FlagStatus
  flagReasons: string[]
}

export interface Incident {
  id: string
  category: Category
  severity: Severity
  status: 'active' | 'resolved'
  /** Mean position of member reports; recomputed on every join. */
  centroid: Coordinates
  createdAt: string
  lastReportAt: string
  reportIds: string[]
  /** Distinct reporterTokens — the honest measure of corroboration. */
  reporterCount: number
  /** Corroboration confidence in 0..1. See `confidence.ts`. */
  confidence: number
  velocityEscalated: boolean
  velocityReason: string | null
  /** The founding report's text, kept as the incident's human-readable identity. */
  headline: string
}

/** Payload of `incident.created` and `incident.updated` stream events. */
export interface IncidentEventPayload {
  incident: Incident
  report: Report
  isNew: boolean
  /** Combined affinity that justified the merge; `null` for founding reports. */
  affinity: number | null
}

/** Payload of `report.quarantined` stream events. */
export interface QuarantineEventPayload {
  report: Report
  reasons: string[]
}
