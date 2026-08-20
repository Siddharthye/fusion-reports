import { FusionBoard } from '@/components/FusionBoard'
import { storageBackend } from '@/store'

export default function ConsolePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-ops-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            FUSION <span className="text-ops-muted">/ duplicate report fusion &amp; corroboration</span>
          </h1>
          <p className="mt-1 text-xs text-ops-muted">
            Every raw report on the right collapses into a corroborated incident on the left.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-ops-muted">
          <span className="rounded border border-ops-border px-2 py-1 font-mono">
            storage: {storageBackend}
          </span>
          <a
            href="/widget"
            className="rounded border border-ops-border px-2 py-1 hover:border-ops-accent hover:text-ops-accent"
          >
            /widget ↗
          </a>
        </div>
      </header>

      <FusionBoard />

      <section className="rounded-lg border border-ops-border bg-ops-panel p-4">
        <h2 className="text-xs font-bold tracking-wide">INTEGRATE IN TEN MINUTES</h2>
        <p className="mt-1 text-[11px] text-ops-muted">
          Three delivery formats — POST reports from any language, embed{' '}
          <code className="text-ops-accent">/widget</code> in an iframe, or drop the React component
          from <code className="text-ops-accent">src/components/embed/</code> in. No API key, no
          database, no build step.
        </p>

        <pre className="mt-3 overflow-x-auto rounded bg-ops-bg p-3 text-[11px] leading-relaxed text-ops-muted">
          <code>{`curl -X POST http://localhost:4104/api/reports \\
  -H 'Content-Type: application/json' \\
  -d '{
    "text": "Fire in Block C, smoke on the second floor",
    "lat": 20.3536, "lng": 85.81893,
    "category": "fire",
    "reporterToken": "device-4471"
  }'
# => { "incidentId": "…", "isNew": false, "corroborationCount": 7, "confidence": 0.81, … }`}</code>
        </pre>
      </section>
    </main>
  )
}
