'use client'

import { useEffect, useState } from 'react'
import type { Incident, Report } from '@/domain/types'
import { CategoryChip } from './CategoryChip'
import { ConfidenceBar } from './ConfidenceBar'
import { SeverityBadge } from './SeverityBadge'

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

export function IncidentCard({ incident }: { incident: Incident }) {
  const [expanded, setExpanded] = useState(false)
  const [members, setMembers] = useState<Report[] | null>(null)

  const memberCount = incident.reportIds.length

  // Members are fetched lazily and re-fetched when the count changes, so an
  // expanded card keeps up with a storm without polling when collapsed.
  useEffect(() => {
    if (!expanded) return
    let cancelled = false

    fetch(`/api/incidents/${incident.id}`)
      .then((response) => response.json() as Promise<{ reports?: Report[] }>)
      .then((body) => {
        if (!cancelled) setMembers(body.reports ?? [])
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [expanded, incident.id, memberCount])

  return (
    <article
      className={`rounded-lg border bg-ops-panel p-3 ${
        incident.severity === 'P0' ? 'border-sev-p0/50' : 'border-ops-border'
      }`}
    >
      <header className="flex items-start gap-2.5">
        <CategoryChip category={incident.category} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-snug">{incident.headline}</h3>
          <p className="mt-0.5 font-mono text-[10px] text-ops-muted">
            {formatTime(incident.lastReportAt)} · {incident.centroid.lat.toFixed(5)},{' '}
            {incident.centroid.lng.toFixed(5)}
          </p>
        </div>
        {incident.severity === 'P0' && (
          <span className="siren-pulse mt-1 size-1.5 shrink-0 rounded-full bg-sev-p0" />
        )}
        <SeverityBadge severity={incident.severity} />
      </header>

      <div className="mt-2.5">
        <ConfidenceBar value={incident.confidence} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-ops-muted">
        <span className="font-mono">
          {plural(memberCount, 'report')} · {plural(incident.reporterCount, 'reporter')}
        </span>
        {incident.velocityEscalated && (
          <span className="rounded bg-sev-p1/15 px-1.5 py-0.5 font-bold tracking-wider text-sev-p1 uppercase">
            surge
          </span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="ml-auto font-semibold text-ops-accent hover:underline"
        >
          {expanded ? 'hide reports' : 'view reports'}
        </button>
      </div>

      {incident.velocityEscalated && incident.velocityReason && (
        <p className="mt-1.5 text-[10px] text-sev-p1">{incident.velocityReason}</p>
      )}

      {expanded && (
        <ul className="mt-2 space-y-1.5 border-t border-ops-border pt-2">
          {members === null && <li className="text-[11px] text-ops-muted">loading member reports…</li>}
          {(members ?? []).map((report) => (
            <li key={report.id} className="text-[11px] leading-snug">
              <span className="font-mono text-ops-muted">{formatTime(report.at)}</span>
              <span className="text-ops-muted"> · {report.reporterToken}</span>
              {report.flag === 'watch' && (
                <span className="ml-1.5 rounded bg-sev-p2/15 px-1 py-px text-[9px] font-bold tracking-wider text-sev-p2 uppercase">
                  watch
                </span>
              )}
              <p className="text-ops-text/90">{report.text}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
