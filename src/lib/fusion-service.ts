import { randomUUID } from 'node:crypto'
import { selectIncident } from '@/domain/cluster'
import { foundIncident, refreshIncident } from '@/domain/incident'
import { assessReport } from '@/domain/quarantine'
import type { Category, FlagStatus, Incident, Report, Severity } from '@/domain/types'
import { store, storageBackend } from '@/store'
import { config } from './config'
import { buildSeedData } from './seed'

const REPORTS = 'reports'
const INCIDENTS = 'incidents'

export interface SubmitReportInput {
  text: string
  lat: number
  lng: number
  category: Category
  reporterToken: string
  at?: string
}

export interface SubmitReportResult {
  reportId: string
  incidentId: string | null
  isNew: boolean
  corroborationCount: number
  confidence: number
  severity: Severity | null
  quarantined: boolean
  flag: FlagStatus
  flagReasons: string[]
}

export interface FusionStats {
  reports: number
  acceptedReports: number
  incidents: number
  activeIncidents: number
  avgConfidence: number
  quarantined: number
  watch: number
  dedupRatio: number
  storageBackend: string
}

/**
 * Seeds demo data the first time the store is read, so a freshly cloned
 * instance opens onto a living board instead of an empty screen.
 */
async function loadState(): Promise<{ reports: Report[]; incidents: Incident[] }> {
  const [reports, incidents] = await Promise.all([
    store.readCollection<Report>(REPORTS),
    store.readCollection<Incident>(INCIDENTS),
  ])
  if (reports.length > 0 || incidents.length > 0) return { reports, incidents }

  const seeded = buildSeedData()
  await store.writeCollection(REPORTS, seeded.reports)
  await store.writeCollection(INCIDENTS, seeded.incidents)
  return seeded
}

/**
 * The whole product in one function: quarantine → cluster → confidence →
 * velocity, then persist and broadcast. Every report — human or storm — goes
 * through this exact path.
 *
 * @example
 * await submitReport({
 *   text: 'Fire in Block C, smoke on the second floor',
 *   lat: 20.3536, lng: 85.81893,
 *   category: 'fire',
 *   reporterToken: 'device-4471',
 * })
 * // => { incidentId, isNew, corroborationCount, confidence, severity, quarantined: false, ... }
 */
export async function submitReport(input: SubmitReportInput): Promise<SubmitReportResult> {
  const { reports, incidents } = await loadState()
  const at = input.at ?? new Date().toISOString()
  const now = new Date(at)

  const report: Report = {
    id: randomUUID(),
    text: input.text,
    category: input.category,
    location: { lat: input.lat, lng: input.lng },
    reporterToken: input.reporterToken,
    at,
    incidentId: null,
    flag: 'clear',
    flagReasons: [],
  }

  const assessment = assessReport(report, { history: reports, incidents, now })
  report.flag = assessment.status
  report.flagReasons = assessment.reasons

  if (assessment.status === 'quarantined') {
    await store.writeCollection(REPORTS, [...reports, report])
    await store.appendEvent('report.quarantined', { report, reasons: assessment.reasons })
    return {
      reportId: report.id, incidentId: null, isNew: false, corroborationCount: 0,
      confidence: 0, severity: null, quarantined: true,
      flag: report.flag, flagReasons: report.flagReasons,
    }
  }

  const byId = new Map(reports.map((item) => [item.id, item]))
  const membersByIncident = new Map(
    incidents.map((incident) => [
      incident.id,
      incident.reportIds.flatMap((id) => byId.get(id) ?? []),
    ]),
  )

  const match = selectIncident(report, incidents, membersByIncident, config.joinThreshold)
  const isNew = match === null
  const incidentId = match ? match.incident.id : randomUUID()
  report.incidentId = incidentId

  const members = [...(membersByIncident.get(incidentId) ?? []), report]
  const base = match ? match.incident : foundIncident(incidentId, report)
  const incident = refreshIncident(base, members, now)

  await store.writeCollection(REPORTS, [...reports, report])
  await store.writeCollection(
    INCIDENTS,
    isNew ? [...incidents, incident] : incidents.map((item) => (item.id === incidentId ? incident : item)),
  )
  await store.appendEvent(isNew ? 'incident.created' : 'incident.updated', {
    incident, report, isNew,
    affinity: match ? Number(match.affinity.combined.toFixed(3)) : null,
  })

  return {
    reportId: report.id, incidentId, isNew,
    corroborationCount: incident.reportIds.length,
    confidence: incident.confidence,
    severity: incident.severity,
    quarantined: false,
    flag: report.flag, flagReasons: report.flagReasons,
  }
}

/** Incidents, most recently touched first. Pass a status to filter. */
export async function listIncidents(status?: 'active' | 'resolved'): Promise<Incident[]> {
  const { incidents } = await loadState()
  const visible = status ? incidents.filter((incident) => incident.status === status) : incidents
  return [...visible].sort((a, b) => b.lastReportAt.localeCompare(a.lastReportAt))
}

/** One incident with its full member reports, or `null` if unknown. */
export async function getIncidentWithReports(
  id: string,
): Promise<{ incident: Incident; reports: Report[] } | null> {
  const { reports, incidents } = await loadState()
  const incident = incidents.find((item) => item.id === id)
  if (!incident) return null

  const members = reports
    .filter((report) => report.incidentId === id)
    .sort((a, b) => a.at.localeCompare(b.at))
  return { incident, reports: members }
}

/** The review lane: quarantined and watch-flagged reports, newest first. */
export async function listFlags(): Promise<Report[]> {
  const { reports } = await loadState()
  return reports
    .filter((report) => report.flag !== 'clear')
    .sort((a, b) => b.at.localeCompare(a.at))
}

/** Headline counters. `dedupRatio` is the sales pitch as a number. */
export async function getStats(): Promise<FusionStats> {
  const { reports, incidents } = await loadState()
  const accepted = reports.filter((report) => report.flag !== 'quarantined')
  const active = incidents.filter((incident) => incident.status === 'active')
  const avgConfidence = active.length
    ? active.reduce((sum, incident) => sum + incident.confidence, 0) / active.length
    : 0

  return {
    reports: reports.length,
    acceptedReports: accepted.length,
    incidents: incidents.length,
    activeIncidents: active.length,
    avgConfidence: Number(avgConfidence.toFixed(2)),
    quarantined: reports.filter((report) => report.flag === 'quarantined').length,
    watch: reports.filter((report) => report.flag === 'watch').length,
    dedupRatio: incidents.length === 0 ? 1 : Number((accepted.length / incidents.length).toFixed(1)),
    storageBackend,
  }
}
