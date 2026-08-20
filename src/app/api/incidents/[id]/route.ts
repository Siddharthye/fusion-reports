import { getIncidentWithReports } from '@/lib/fusion-service'
import { fail, ok } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * `GET /api/incidents/:id`
 * One incident plus its full member reports in arrival order — the drill-down
 * behind the console's expandable card.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  const found = await getIncidentWithReports(id)
  if (!found) return fail('Unknown incident id', 404)

  return ok(found)
}
