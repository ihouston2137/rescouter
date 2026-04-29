import connectDB from '@/lib/db'
import ScoutRadiozSummary from '@/lib/models/ScoutRadiozSummary'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  await connectDB()
  const summaries = await ScoutRadiozSummary
    .find({ eventCode: code.toUpperCase() })
    .lean()
  return Response.json(summaries)
}
