import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import ScoutRadioz from '@/lib/models/ScoutRadioz'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const season = parseInt(searchParams.get('season') ?? '0', 10)

  await connectDB()
  const filter: Record<string, unknown> = {}
  if (season) filter.season = season

  const codes: string[] = await ScoutRadioz.distinct('eventCode', filter)
  return Response.json(codes.sort())
}
