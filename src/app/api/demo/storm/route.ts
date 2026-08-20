import { config } from '@/lib/config'
import { submitReport, type SubmitReportResult } from '@/lib/fusion-service'
import { fail, ok } from '@/lib/http'
import { stormSchema } from '@/lib/schemas'
import { stormInputs } from '@/lib/storm'

export const dynamic = 'force-dynamic'
/** Paced storms hold the request open for ~30s; tell serverless hosts that is intended. */
export const maxDuration = 60

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** In instant mode, timestamps are back-dated across this window. */
const BACKFILL_SPREAD_MS = 90_000

/**
 * `POST /api/demo/storm { scenario?, pace? }`
 *
 * THE DEMO BUTTON. Fires ~20 varied phrasings of one event plus one obvious
 * prank through the REAL pipeline — same code path as a human report, nothing
 * faked. Paced mode (default) drips them in real time so the console visibly
 * fuses noise into one climbing incident; `pace: false` back-dates them over
 * ~90s and returns immediately (what the smoke tests use).
 */
export async function POST(request: Request) {
  // An empty body is a valid "give me the default storm" request.
  let raw: unknown = {}
  try {
    raw = await request.json()
  } catch {
    // No body — defaults apply.
  }

  const parsed = stormSchema.safeParse(raw)
  if (!parsed.success) return fail('Validation failed', 400, parsed.error.issues)
  const { scenario, pace } = parsed.data

  const inputs = stormInputs(scenario)
  const startedAt = Date.now()
  const results: SubmitReportResult[] = []

  for (const [index, input] of inputs.entries()) {
    const at = pace
      ? new Date().toISOString()
      : new Date(startedAt - BACKFILL_SPREAD_MS + ((index + 1) * BACKFILL_SPREAD_MS) / inputs.length).toISOString()

    results.push(await submitReport({ ...input, at }))
    if (pace && index < inputs.length - 1) await sleep(config.stormPaceMs)
  }

  // The storm's headline: which incident absorbed the crowd, and where the
  // confidence ended up.
  const accepted = results.filter((result) => !result.quarantined)
  const tally = new Map<string, number>()
  for (const result of accepted) {
    if (result.incidentId) tally.set(result.incidentId, (tally.get(result.incidentId) ?? 0) + 1)
  }
  const primary = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]
  const finalForPrimary = [...accepted].reverse().find((result) => result.incidentId === primary?.[0])

  return ok({
    scenario,
    paced: pace,
    submitted: results.length,
    quarantined: results.length - accepted.length,
    incidentId: primary?.[0] ?? null,
    corroborationCount: finalForPrimary?.corroborationCount ?? 0,
    confidence: finalForPrimary?.confidence ?? 0,
    durationMs: Date.now() - startedAt,
  })
}
