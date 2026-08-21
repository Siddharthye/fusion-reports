'use client'

import { useFusionStream } from '@/hooks/use-fusion-stream'
import { IncidentCard } from './IncidentCard'
import { QuarantineLane } from './QuarantineLane'
import { ReportTicker } from './ReportTicker'
import { StatsBar } from './StatsBar'
import { StormButton } from './StormButton'

/**
 * The fusion board: corroborated incidents on the left, the raw firehose and
 * its quarantine fallout on the right. Shared by the console (`/`) and the
 * embeddable widget (`/widget`).
 */
export function FusionBoard() {
  const { incidents, flags, ticker, stats, status } = useFusionStream()
  const active = incidents.filter((incident) => incident.status === 'active')
  const resolved = incidents.filter((incident) => incident.status === 'resolved')

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <section className="min-w-0">
        <h2 className="text-[10px] font-bold tracking-wider uppercase">
          Active incidents{' '}
          <span className="font-mono font-normal text-ops-muted">{active.length}</span>
        </h2>

        <div className="mt-2 space-y-2.5">
          {active.length === 0 ? (
            <p className="rounded-lg border border-ops-border bg-ops-panel py-10 text-center text-[11px] text-ops-muted">
              No active incidents. Run a report storm to watch fifty voices fuse into one.
            </p>
          ) : (
            active.map((incident) => <IncidentCard key={incident.id} incident={incident} />)
          )}
        </div>

        {resolved.length > 0 && (
          <>
            <h2 className="mt-5 text-[10px] font-bold tracking-wider uppercase text-ops-muted">
              Resolved
            </h2>
            <ul className="mt-2 space-y-1.5">
              {resolved.map((incident) => (
                <li
                  key={incident.id}
                  className="flex items-baseline gap-2 rounded border border-ops-border bg-ops-panel/60 px-3 py-2 text-[11px] text-ops-muted"
                >
                  <span className="min-w-0 flex-1 truncate">{incident.headline}</span>
                  <span className="shrink-0 font-mono text-[10px]">
                    {incident.reportIds.length} reports · {Math.round(incident.confidence * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <aside className="space-y-3">
        <StatsBar stats={stats} status={status} />
        <StormButton />
        <ReportTicker entries={ticker} />
        <QuarantineLane flags={flags} />
      </aside>
    </div>
  )
}
