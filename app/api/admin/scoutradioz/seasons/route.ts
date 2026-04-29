import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import ScoutRadioz from '@/lib/models/ScoutRadioz'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const seasons: number[] = await ScoutRadioz.distinct('season')
  return Response.json(seasons.sort((a, b) => b - a))
}
