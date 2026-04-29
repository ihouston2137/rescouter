import connectDB from '@/lib/db'
import ScoutRadiozProcessed from '@/lib/models/ScoutRadiozProcessed'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string; team: string }> },
) {
  const { code, team } = await params
  const teamNumber = parseInt(team, 10)
  if (isNaN(teamNumber)) return Response.json([], { status: 400 })

  await connectDB()
  const records = await ScoutRadiozProcessed
    .find({ eventCode: code.toUpperCase(), teamNumber })
    .sort({ tournamentLevel: 1, matchNumber: 1 })
    .lean()
  return Response.json(records)
}
