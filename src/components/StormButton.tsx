'use client'

import { useState } from 'react'

const SCENARIOS = ['fire', 'medical', 'harassment'] as const
type Scenario = (typeof SCENARIOS)[number]

interface StormResponse {
  submitted: number
  quarantined: number
  corroborationCount: number
  confidence: number
  error?: string
}

/**
 * The demo trigger. A paced storm keeps this request open for ~30 seconds
 * while the board updates live over SSE — the button is intentionally the
 * boring part of the demo.
 */
export function StormButton() {
  const [scenario, setScenario] = useState<Scenario>('fire')
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const launch = async () => {
    setRunning(true)
    setSummary(null)

    try {
      const response = await fetch('/api/demo/storm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      })
      const body = (await response.json()) as StormResponse

      if (!response.ok) {
        setSummary(body.error ?? 'Storm failed')
        return
      }

      setSummary(
        `${body.submitted} reports fused into 1 incident at ${Math.round(body.confidence * 100)}% confidence — ${body.quarantined} prank quarantined`,
      )
    } catch {
      setSummary('Storm failed — is the server running?')
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="rounded-lg border border-ops-border bg-ops-panel p-3">
      <div className="flex gap-1.5">
        {SCENARIOS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            disabled={running}
            className={`flex-1 rounded border py-1 text-[10px] font-bold tracking-wider uppercase transition ${
              scenario === option
                ? 'border-ops-accent bg-ops-accent/15 text-ops-accent'
                : 'border-ops-border text-ops-muted hover:border-ops-muted'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={launch}
        disabled={running}
        className="mt-2 w-full rounded border border-ops-accent/40 bg-ops-accent/10 py-2.5 text-xs font-bold tracking-widest text-ops-accent uppercase transition hover:bg-ops-accent/20 disabled:opacity-50"
      >
        {running ? 'Storm in progress — watch the board' : 'Simulate report storm'}
      </button>

      <p className="mt-1.5 text-[10px] text-ops-muted">
        Fires ~20 phrasings of one {scenario} event + 1 prank through the real pipeline over ~30s.
      </p>

      {summary && <p className="mt-1.5 text-[11px] text-emerald-400">{summary}</p>}
    </section>
  )
}
