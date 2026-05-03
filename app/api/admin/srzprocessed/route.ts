import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import ScoutRadiozProcessed from '@/lib/models/ScoutRadiozProcessed'

const ALLOWED_SORT = new Set([
  'season', 'eventCode', 'teamNumber', 'tournamentLevel', 'matchNumber', 'org_key',
  'startPosition', 'autoScoredFuel', 'autoCycles', 'autoScore', 'autoClimb',
  'teleScoredFuel', 'teleFuelCycles', 'teleScore', 'totalScore', 'telePassCycles',
  'endgameClimb', 'endgameClimbLevel', 'passNeutral', 'passOpposite', 'beached',
  'stuckTrench', 'stuckBump', 'damaged', 'died', 'tipped',
  'accuracyRating', 'skillRating', 'defenseRating',
])

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page     = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const pageSize = Math.min(200, Math.max(10, parseInt(searchParams.get('pageSize') ?? '50', 10)))
  const sortKey  = ALLOWED_SORT.has(searchParams.get('sortKey') ?? '') ? searchParams.get('sortKey')! : 'eventCode'
  const sortDir  = searchParams.get('sortDir') === 'desc' ? -1 : 1

  const filter: Record<string, unknown> = {}
  const eventCode  = searchParams.get('eventCode')?.trim().toUpperCase()
  const teamNumber = searchParams.get('teamNumber')?.trim()
  const orgKey     = searchParams.get('orgKey')?.trim()
  const season     = searchParams.get('season')?.trim()
  if (eventCode)  filter.eventCode  = eventCode
  if (teamNumber) filter.teamNumber = parseInt(teamNumber, 10)
  if (orgKey)     filter.org_key    = orgKey
  if (season)     filter.season     = parseInt(season, 10)

  await connectDB()

  const [rows, total] = await Promise.all([
    ScoutRadiozProcessed.find(filter)
      .sort({ [sortKey]: sortDir })
      .skip(page * pageSize)
      .limit(pageSize)
      .lean(),
    ScoutRadiozProcessed.countDocuments(filter),
  ])

  return Response.json({ rows, total, page, pageSize })
}
