'use client'

import type { TickerEntry } from '@/hooks/use-fusion-stream'

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const KIND_META = {
  new: { label: 'NEW INCIDENT', className: 'text-ops-accent' },
  merged: { label: 'MERGED', className: 'text-emerald-400' },
  quarantined: { label: 'QUARANTINED', className: 'text-sev-p0' },
} as const

/**
 * The raw feed — every incoming report scrolls past here before visibly
 * collapsing into an incident card on the left. Seeing both sides at once is
 * the whole pitch: noise on the right, signal on the left.
 */
export function ReportTicker({ entries }: { entries: TickerEntry[] }) {
  return (
    <section className="rounded-lg border border-ops-border bg-ops-panel p-3">
      <h2 className="text-[10px] font-bold tracking-wider uppercase">
        Raw report ticker{' '}
        <span className="font-mono font-normal text-ops-muted">{entries.length}</span>
      </h2>

      <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-ops-muted">
            No live reports yet — run a storm and watch fusion happen.
          </p>
        ) : (
          entries.map((entry) => {
            const meta = KIND_META[entry.kind]
            return (
              <div key={entry.id} className="border-l-2 border-ops-border pl-2 text-[11px] leading-snug">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[10px] text-ops-muted">
                    {formatTime(entry.report.at)}
                  </span>
                  <span className={`text-[9px] font-bold tracking-wider ${meta.className}`}>
                    {meta.label}
                  </span>
                  {entry.kind === 'merged' && entry.affinity !== null && (
                    <span className="font-mono text-[9px] text-ops-muted">aff {entry.affinity}</span>
                  )}
                </div>
                <p
                  className={`truncate ${
                    entry.kind === 'quarantined' ? 'text-ops-muted line-through' : 'text-ops-text/90'
                  }`}
                >
                  {entry.report.text}
                </p>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
