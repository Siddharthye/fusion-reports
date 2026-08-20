import { listFlags } from '@/lib/fusion-service'
import { ok } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * `GET /api/flags`
 * The review lane: quarantined reports (never became incidents) and
 * watch-flagged reports (joined, but marked), each carrying the exact
 * human-readable reasons quarantine recorded.
 */
export async function GET() {
  const flags = await listFlags()
  return ok({ flags, count: flags.length })
}
