import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import ScoutRadiozConfig from '@/lib/models/ScoutRadiozConfig'
import ScoutRadioz from '@/lib/models/ScoutRadioz'
import ScoutRadiozProcessed from '@/lib/models/ScoutRadiozProcessed'
import { processRecord, buildScopeFilter, type ConfigDoc, type FieldMapping } from '@/lib/scoutradiozProcess'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const config = await ScoutRadiozConfig.findById(id).lean() as ConfigDoc | null
  if (!config) return Response.json({ error: 'Config not found' }, { status: 404 })

  const filter = buildScopeFilter(config)
  const rows = await ScoutRadioz.find(filter).lean() as {
    org_key: string; season: number; eventCode: string
    teamNumber: number; tournamentLevel: string; matchNumber: number
    data: Record<string, string>
  }[]

  if (rows.length === 0) {
    return Response.json({ recordsWritten: 0, message: 'Done — no matching records found.' })
  }

  const ops = rows.map(row => {
    const output = processRecord(row.data ?? {}, config.mappings as FieldMapping[])
    return {
      updateOne: {
        filter: {
          org_key:         row.org_key,
          season:          row.season,
          eventCode:       row.eventCode,
          teamNumber:      row.teamNumber,
          tournamentLevel: row.tournamentLevel,
          matchNumber:     row.matchNumber,
        },
        update: {
          $set: {
            org_key:         row.org_key,
            season:          row.season,
            eventCode:       row.eventCode,
            teamNumber:      row.teamNumber,
            tournamentLevel: row.tournamentLevel,
            matchNumber:     row.matchNumber,
            ...output,
          },
        },
        upsert: true,
      },
    }
  })

  const result = await ScoutRadiozProcessed.bulkWrite(ops, { ordered: false })
  const recordsWritten = result.upsertedCount + result.modifiedCount

  return Response.json({
    recordsWritten,
    message: `Done — ${recordsWritten} record${recordsWritten !== 1 ? 's' : ''} written.`,
  })
}
