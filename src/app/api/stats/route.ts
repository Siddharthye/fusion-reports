import { getStats } from '@/lib/fusion-service'
import { ok } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * `GET /api/stats` — headline counters for dashboards, including the number
 * the module is sold on: `dedupRatio` (accepted reports per incident).
 */
export async function GET() {
  return ok(await getStats())
}
