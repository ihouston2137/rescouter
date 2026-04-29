import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import ScoutRadioz from '@/lib/models/ScoutRadioz'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const season    = parseInt(searchParams.get('season') ?? '0', 10)
  const eventCode = searchParams.get('eventCode')?.trim().toUpperCase() || null
  const orgKey    = searchParams.get('orgKey')?.trim() || null

  const filter: Record<string, unknown> = {}
  if (season)    filter.season    = season
  if (eventCode) filter.eventCode = eventCode
  if (orgKey)    filter.org_key   = orgKey

  await connectDB()
  const sample = await ScoutRadioz.findOne(filter).lean() as { data?: Record<string, unknown> } | null
  if (!sample?.data) return Response.json([])

  return Response.json(Object.keys(sample.data).sort())
}
