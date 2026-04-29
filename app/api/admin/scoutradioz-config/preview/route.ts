import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import ScoutRadioz from '@/lib/models/ScoutRadioz'
import { processRecord, buildScopeFilter, type ConfigDoc } from '@/lib/scoutradiozProcess'

const PREVIEW_LIMIT = 20

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const config: ConfigDoc = await request.json()
  const filter = buildScopeFilter(config)

  await connectDB()

  const [total, rows] = await Promise.all([
    ScoutRadioz.countDocuments(filter),
    ScoutRadioz.find(filter).limit(PREVIEW_LIMIT).lean() as Promise<{
      org_key: string; season: number; eventCode: string
      teamNumber: number; tournamentLevel: string; matchNumber: number
      data: Record<string, string>
    }[]>,
  ])

  const records = rows.map(row => ({
    org_key:         row.org_key,
    season:          row.season,
    eventCode:       row.eventCode,
    teamNumber:      row.teamNumber,
    tournamentLevel: row.tournamentLevel,
    matchNumber:     row.matchNumber,
    output:          processRecord(row.data ?? {}, config.mappings),
  }))

  return Response.json({ records, total })
}
