import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import ScoutRadioz from '@/lib/models/ScoutRadioz'

const PAGE_SIZE = 50

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const eventCode  = searchParams.get('eventCode')?.trim().toUpperCase() || null
  const teamNumber = searchParams.get('teamNumber')?.trim()
  const teamNum    = teamNumber ? parseInt(teamNumber, 10) : NaN
  const orgKey     = searchParams.get('orgKey')?.trim() || null
  const page       = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10) || 0)

  const filter: Record<string, unknown> = {}
  if (eventCode)       filter.eventCode  = eventCode
  if (!isNaN(teamNum)) filter.teamNumber = teamNum
  if (orgKey)          filter.org_key    = orgKey

  await connectDB()

  const SORT_FIELDS = new Set(['season', 'eventCode', 'teamNumber', 'tournamentLevel', 'matchNumber', 'org_key'])
  const rawSortKey = searchParams.get('sortKey') ?? 'season'
  const sortKey    = SORT_FIELDS.has(rawSortKey) ? rawSortKey : 'season'
  const sortDir    = searchParams.get('sortDir') === 'asc' ? 1 : -1

  const [total, rows] = await Promise.all([
    ScoutRadioz.countDocuments(filter),
    ScoutRadioz.find(filter, { data: 0 })
      .sort({ [sortKey]: sortDir })
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
  ])

  return Response.json({ rows, total, page, pageSize: PAGE_SIZE })
}
