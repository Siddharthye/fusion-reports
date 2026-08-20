'use client'

import { useEffect, useRef, useState } from 'react'
import type {
  Incident,
  IncidentEventPayload,
  QuarantineEventPayload,
  Report,
} from '@/domain/types'
import type { FusionStats } from '@/lib/fusion-service'

export type StreamStatus = 'connecting' | 'live' | 'offline'

export interface TickerEntry {
  id: string
  report: Report
  kind: 'new' | 'merged' | 'quarantined'
  affinity: number | null
}

const TICKER_LIMIT = 30
const FLAGS_LIMIT = 30
const STATS_DEBOUNCE_MS = 400

const byLastReport = (a: Incident, b: Incident) => b.lastReportAt.localeCompare(a.lastReportAt)

/**
 * The console's single source of truth: an initial snapshot from the REST API,
 * then live deltas over SSE. `EventSource` reconnects by itself and replays
 * `Last-Event-ID`, so the server's 50s stream rotation is invisible here.
 *
 * @example
 * const { incidents, flags, ticker, stats, status } = useFusionStream()
 */
export function useFusionStream() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [flags, setFlags] = useState<Report[]>([])
  const [ticker, setTicker] = useState<TickerEntry[]>([])
  const [stats, setStats] = useState<FusionStats | null>(null)
  const [status, setStatus] = useState<StreamStatus>('connecting')
  const statsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let disposed = false

    // Stats are cheap but a paced storm produces ~20 events in quick clusters;
    // debouncing keeps this at a handful of fetches instead of one per event.
    const refreshStats = () => {
      if (statsTimer.current) clearTimeout(statsTimer.current)
      statsTimer.current = setTimeout(async () => {
        try {
          const response = await fetch('/api/stats')
          const body = (await response.json()) as FusionStats
          if (!disposed) setStats(body)
        } catch {
          // The stream indicator already reflects connectivity problems.
        }
      }, STATS_DEBOUNCE_MS)
    }

    const loadSnapshot = async () => {
      const [incidentsBody, flagsBody, statsBody] = await Promise.all([
        fetch('/api/incidents').then((r) => r.json() as Promise<{ incidents: Incident[] }>),
        fetch('/api/flags').then((r) => r.json() as Promise<{ flags: Report[] }>),
        fetch('/api/stats').then((r) => r.json() as Promise<FusionStats>),
      ])
      if (disposed) return
      setIncidents([...incidentsBody.incidents].sort(byLastReport))
      setFlags(flagsBody.flags.slice(0, FLAGS_LIMIT))
      setStats(statsBody)
    }
    loadSnapshot().catch(() => setStatus('offline'))

    const pushTicker = (entry: TickerEntry) =>
      setTicker((current) => [entry, ...current].slice(0, TICKER_LIMIT))

    const source = new EventSource('/api/events')
    source.onopen = () => setStatus('live')
    source.onerror = () => setStatus('offline')

    const onIncident = (event: Event, kind: 'new' | 'merged') => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as IncidentEventPayload
      setStatus('live')
      setIncidents((current) =>
        [payload.incident, ...current.filter((item) => item.id !== payload.incident.id)].sort(byLastReport),
      )
      // Watch-flagged reports join incidents but still belong in the review lane.
      if (payload.report.flag === 'watch') {
        setFlags((current) => [payload.report, ...current].slice(0, FLAGS_LIMIT))
      }
      pushTicker({ id: payload.report.id, report: payload.report, kind, affinity: payload.affinity })
      refreshStats()
    }

    source.addEventListener('incident.created', (event) => onIncident(event, 'new'))
    source.addEventListener('incident.updated', (event) => onIncident(event, 'merged'))
    source.addEventListener('report.quarantined', (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as QuarantineEventPayload
      setStatus('live')
      setFlags((current) => [payload.report, ...current].slice(0, FLAGS_LIMIT))
      pushTicker({ id: payload.report.id, report: payload.report, kind: 'quarantined', affinity: null })
      refreshStats()
    })

    return () => {
      disposed = true
      source.close()
      if (statsTimer.current) clearTimeout(statsTimer.current)
    }
  }, [])

  return { incidents, flags, ticker, stats, status }
}
