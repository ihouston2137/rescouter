import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import ScoutRadiozConfig from '@/lib/models/ScoutRadiozConfig'
import ScoutRadioz from '@/lib/models/ScoutRadioz'
import ScoutRadiozProcessed from '@/lib/models/ScoutRadiozProcessed'
import { processRecord, buildScopeFilter, type ConfigDoc, type FieldMapping } from '@/lib/scoutradiozProcess'

export async function POST() {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()

    const configs = await ScoutRadiozConfig.find({}).lean() as ConfigDoc[]
    if (configs.length === 0) {
      return Response.json({ message: 'No configs found.', configsRun: 0, recordsWritten: 0 })
    }

    let configsRun    = 0
    let recordsWritten = 0

    for (const config of configs) {
      const filter = buildScopeFilter(config)
      const rows = await ScoutRadioz.find(filter).lean() as {
        org_key: string; season: number; eventCode: string
        teamNumber: number; tournamentLevel: string; matchNumber: number
        data: Record<string, string>
      }[]

      if (rows.length === 0) continue

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
      recordsWritten += result.upsertedCount + result.modifiedCount
      configsRun++
    }

    return Response.json({
      configsRun,
      recordsWritten,
      message: `Done — ${recordsWritten} records written across ${configsRun} config${configsRun !== 1 ? 's' : ''}.`,
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
