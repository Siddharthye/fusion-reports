'use client'

import type { StreamStatus } from '@/hooks/use-fusion-stream'
import type { FusionStats } from '@/lib/fusion-service'

const STATUS_META = {
  connecting: { text: 'connecting', className: 'text-ops-muted' },
  live: { text: 'live', className: 'text-emerald-400' },
  offline: { text: 'reconnecting', className: 'text-sev-p1' },
} as const

/**
 * The dedup ratio, displayed big — "31 reports → 5 incidents" IS the product,
 * so it gets the largest type on the rail.
 */
export function StatsBar({ stats, status }: { stats: FusionStats | null; status: StreamStatus }) {
  const indicator = STATUS_META[status]

  return (
    <section className="rounded-lg border border-ops-border bg-ops-panel p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[10px] font-bold tracking-wider uppercase">Fusion stats</h2>
        <span className={`flex items-center gap-1 text-[10px] ${indicator.className}`}>
          <span
            className={`inline-block size-1.5 rounded-full bg-current ${
              status === 'live' ? 'siren-pulse' : ''
            }`}
          />
          {indicator.text}
        </span>
      </div>

      {stats === null ? (
        <p className="mt-3 text-[11px] text-ops-muted">loading…</p>
      ) : (
        <>
          <p className="mt-2 font-mono text-xl font-bold tracking-tight">
            {stats.acceptedReports} reports{' '}
            <span className="text-ops-accent">→ {stats.incidents} incidents</span>
          </p>
          <p className="mt-0.5 text-[11px] text-ops-muted">
            deduplication ratio{' '}
            <span className="font-mono font-semibold text-ops-text">×{stats.dedupRatio}</span>
          </p>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            <div className="flex justify-between gap-2">
              <dt className="text-ops-muted">active</dt>
              <dd className="font-mono">{stats.activeIncidents}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ops-muted">avg confidence</dt>
              <dd className="font-mono">{Math.round(stats.avgConfidence * 100)}%</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ops-muted">quarantined</dt>
              <dd className="font-mono">{stats.quarantined}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ops-muted">watch</dt>
              <dd className="font-mono">{stats.watch}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  )
}
