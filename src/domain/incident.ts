import { corroborationConfidence } from './confidence'
import { centroidOf } from './geo'
import type { Category, Incident, Report, Severity } from './types'
import { velocityEscalation } from './velocity'

/**
 * Baseline severity by category, before velocity has said anything. Fire and
 * medical start high because a single true positive is catastrophic; the rest
 * start lower and earn escalation through corroboration speed.
 */
const BASE_SEVERITY: Record<Category, Severity> = {
  fire: 'P1',
  medical: 'P1',
  security: 'P2',
  harassment: 'P2',
  infrastructure: 'P3',
  other: 'P3',
}

/** Lower rank = more severe, so comparisons read like priority queues. */
const SEVERITY_RANK: Record<Severity, number> = { P0: 0, P1: 1, P2: 2, P3: 3 }

/**
 * Baseline severity for a category.
 *
 * @example
 * baseSeverityFor('fire') // => 'P1'
 */
export function baseSeverityFor(category: Category): Severity {
  return BASE_SEVERITY[category]
}

/**
 * A brand-new incident founded by one report. Derived fields (confidence,
 * centroid, velocity) are placeholders until `refreshIncident` runs — callers
 * always refresh immediately after founding.
 *
 * @example
 * refreshIncident(foundIncident('inc-1', report), [report], new Date())
 */
export function foundIncident(id: string, report: Report): Incident {
  return {
    id,
    category: report.category,
    severity: baseSeverityFor(report.category),
    status: 'active',
    centroid: { ...report.location },
    createdAt: report.at,
    lastReportAt: report.at,
    reportIds: [report.id],
    reporterCount: 1,
    confidence: 0,
    velocityEscalated: false,
    velocityReason: null,
    headline: report.text,
  }
}

/**
 * Recomputes every derived field from the full member set — centroid,
 * confidence, reporter count, severity. Called on every join so the incident
 * card's numbers climb live.
 *
 * Escalation LATCHES: severity only ratchets upward here, because standing an
 * emergency down is a human judgement, not arithmetic.
 *
 * @example
 * refreshIncident(incident, members, new Date())
 * // => { ...incident, confidence: 0.96, severity: 'P0', velocityEscalated: true }
 */
export function refreshIncident(
  incident: Incident,
  members: readonly Report[],
  now: Date,
): Incident {
  const sorted = [...members].sort((a, b) => a.at.localeCompare(b.at))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  const velocity = velocityEscalation(
    sorted.map((member) => member.at),
    baseSeverityFor(incident.category),
    now,
  )
  const severity =
    SEVERITY_RANK[velocity.priority] < SEVERITY_RANK[incident.severity]
      ? velocity.priority
      : incident.severity

  return {
    ...incident,
    centroid: centroidOf(sorted.map((member) => member.location)),
    lastReportAt: last?.at ?? incident.lastReportAt,
    reportIds: sorted.map((member) => member.id),
    reporterCount: new Set(sorted.map((member) => member.reporterToken)).size,
    confidence: corroborationConfidence(sorted),
    severity,
    velocityEscalated: incident.velocityEscalated || velocity.reason !== null,
    velocityReason: velocity.reason ?? incident.velocityReason,
    headline: first?.text ?? incident.headline,
  }
}
