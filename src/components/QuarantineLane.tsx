'use client'

import type { Report } from '@/domain/types'

const FLAG_META = {
  quarantined: { label: 'QUARANTINED', className: 'bg-sev-p0/15 text-sev-p0 border-sev-p0/40' },
  watch: { label: 'WATCH', className: 'bg-sev-p2/15 text-sev-p2 border-sev-p2/40' },
} as const

/**
 * The review lane. Quarantined reports never became incidents; watch reports
 * joined but stay marked. Every row shows the exact reason, because a trust
 * system nobody can audit is a trust system nobody trusts.
 */
export function QuarantineLane({ flags }: { flags: Report[] }) {
  return (
    <section className="rounded-lg border border-ops-border bg-ops-panel p-3">
      <h2 className="text-[10px] font-bold tracking-wider uppercase">
        Quarantine lane{' '}
        <span className="font-mono font-normal text-ops-muted">{flags.length}</span>
      </h2>

      <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
        {flags.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-ops-muted">
            Nothing in review — the joke lexicon and lone-night heuristics are idle.
          </p>
        ) : (
          flags.map((report) => {
            const meta = FLAG_META[report.flag === 'quarantined' ? 'quarantined' : 'watch']
            return (
              <div key={report.id} className="rounded border border-ops-border bg-ops-bg/60 p-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                  <span className="truncate font-mono text-[10px] text-ops-muted">
                    {report.reporterToken}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-ops-text/90">{report.text}</p>
                {report.flagReasons.map((reason) => (
                  <p key={reason} className="mt-0.5 text-[10px] italic text-ops-muted">
                    {reason}
                  </p>
                ))}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
