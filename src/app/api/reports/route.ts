import { submitReport } from '@/lib/fusion-service'
import { ok, parseBody } from '@/lib/http'
import { submitReportSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

/**
 * `POST /api/reports`
 *
 * The single ingestion point. Every report runs the full pipeline:
 * quarantine → cluster → confidence → velocity, then broadcasts
 * `incident.created` / `incident.updated` / `report.quarantined` on the
 * event stream.
 *
 * Responses: 201 founded a new incident, 200 corroborated an existing one,
 * 202 accepted but quarantined into the review lane.
 */
export async function POST(request: Request) {
  const parsed = await parseBody(request, submitReportSchema)
  if (!parsed.success) return parsed.response

  const result = await submitReport(parsed.data)
  const status = result.quarantined ? 202 : result.isNew ? 201 : 200

  return ok(result, status)
}
