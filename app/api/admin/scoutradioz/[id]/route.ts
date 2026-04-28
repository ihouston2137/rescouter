import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import ScoutRadioz from '@/lib/models/ScoutRadioz'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await connectDB()

  const row = await ScoutRadioz.findById(id).lean()
  if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json(row)
}
