import { NextRequest } from 'next/server'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import { computeAllianceContributions } from '@/lib/allianceOPR'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  await connectDB()

  const eventDoc = await FrcEvent.findOne({ code }).select('season').lean()
  if (!eventDoc) {
    return Response.json({ error: 'Event not found' }, { status: 404 })
  }
  const season = (eventDoc as any).season as number

  const result = await computeAllianceContributions(code, season)

  return Response.json({
    eventCode: code,
    season,
    matchesAnalyzed: result.matchesAnalyzed,
    teamsAnalyzed:   result.teamsAnalyzed,
    regressionValid: result.valid,
    teams:           result.teams,
  })
}
