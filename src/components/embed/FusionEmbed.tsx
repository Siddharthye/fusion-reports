'use client'

/**
 * FusionEmbed — the copy-paste React embed.
 *
 * SELF-CONTAINED ON PURPOSE: no imports from this repo, no CSS framework, no
 * fetch wrapper. Buyers copy this ONE file into any React 18+ app, point
 * `baseUrl` at a running FUSION instance (CORS is already open server-side),
 * and get the live incident board. Styling is inline so it cannot clash with
 * the host app's stylesheet.
 *
 * @example
 * <FusionEmbed baseUrl="http://localhost:4104" maxIncidents={5} />
 */

import { useEffect, useState, type CSSProperties } from 'react'

type EmbedSeverity = 'P0' | 'P1' | 'P2' | 'P3'

interface EmbedIncident {
  id: string
  headline: string
  category: string
  severity: EmbedSeverity
  status: 'active' | 'resolved'
  confidence: number
  reporterCount: number
  reportIds: string[]
  lastReportAt: string
  velocityEscalated: boolean
}

export interface FusionEmbedProps {
  baseUrl: string
  maxIncidents?: number
}

/** The AEGIS severity palette — sacred across every module. */
const SEVERITY_COLOR: Record<EmbedSeverity, string> = {
  P0: '#ff453a',
  P1: '#ff9f0a',
  P2: '#ffd60a',
  P3: '#a78bfa',
}

const styles: Record<string, CSSProperties> = {
  root: {
    background: '#0d0c13',
    border: '1px solid #272437',
    borderRadius: 8,
    color: '#ededf4',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    padding: 12,
  },
  title: { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', margin: 0 },
  card: {
    background: '#14131d',
    border: '1px solid #272437',
    borderRadius: 6,
    marginTop: 8,
    padding: 10,
  },
  headline: {
    fontSize: 13, fontWeight: 600, margin: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  meta: { color: '#9b98ad', fontFamily: 'ui-monospace, monospace', fontSize: 10, marginTop: 4 },
  barTrack: {
    background: '#0d0c13', borderRadius: 999, height: 5, marginTop: 8, overflow: 'hidden',
  },
  barFill: {
    background: '#a78bfa', borderRadius: 999, height: '100%',
    transformOrigin: 'left', transition: 'transform 0.7s ease-out',
  },
  empty: { color: '#9b98ad', fontSize: 11, padding: '16px 0', textAlign: 'center' },
}

export function FusionEmbed({ baseUrl, maxIncidents = 6 }: FusionEmbedProps) {
  const [incidents, setIncidents] = useState<EmbedIncident[]>([])
  const base = baseUrl.replace(/\/$/, '')

  useEffect(() => {
    let disposed = false

    fetch(`${base}/api/incidents?status=active`)
      .then((response) => response.json() as Promise<{ incidents: EmbedIncident[] }>)
      .then((body) => {
        if (!disposed) setIncidents(body.incidents)
      })
      .catch(() => {})

    // The server rotates streams every ~50s; EventSource reconnects and
    // resumes from Last-Event-ID by itself, so no retry code is needed here.
    const source = new EventSource(`${base}/api/events`)
    const upsert = (event: MessageEvent<string>) => {
      const { incident } = JSON.parse(event.data) as { incident: EmbedIncident }
      setIncidents((current) => [
        incident,
        ...current.filter((item) => item.id !== incident.id),
      ])
    }
    source.addEventListener('incident.created', upsert)
    source.addEventListener('incident.updated', upsert)

    return () => {
      disposed = true
      source.close()
    }
  }, [base])

  const visible = incidents.filter((incident) => incident.status === 'active').slice(0, maxIncidents)

  return (
    <div style={styles.root}>
      <p style={styles.title}>LIVE INCIDENTS · FUSION</p>

      {visible.length === 0 && <p style={styles.empty}>No active incidents.</p>}

      {visible.map((incident) => (
        <div key={incident.id} style={styles.card}>
          <p style={styles.headline}>
            <span style={{ color: SEVERITY_COLOR[incident.severity], fontWeight: 700 }}>
              {incident.severity}
            </span>{' '}
            {incident.headline}
          </p>
          <p style={styles.meta}>
            {incident.reportIds.length} reports · {incident.reporterCount} reporters ·{' '}
            {Math.round(incident.confidence * 100)}% corroborated
            {incident.velocityEscalated ? ' · SURGE' : ''}
          </p>
          <div style={styles.barTrack}>
            <div style={{ ...styles.barFill, transform: `scaleX(${incident.confidence})` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
