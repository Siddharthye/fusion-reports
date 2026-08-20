import { listIncidents } from '@/lib/fusion-service'
import { ok } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * `GET /api/incidents?status=active|resolved`
 * Fused incidents with computed fields (confidence, centroid, reporterCount),
 * most recently touched first. Omit `status` for everything.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('status')
  const status = raw === 'active' || raw === 'resolved' ? raw : undefined

  const incidents = await listIncidents(status)
  return ok({ incidents, count: incidents.length })
}
