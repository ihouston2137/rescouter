import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import ScoutRadiozConfig from '@/lib/models/ScoutRadiozConfig'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()
  const doc = await ScoutRadiozConfig.findById(id).lean()
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(doc)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()
  await ScoutRadiozConfig.findByIdAndDelete(id)
  return Response.json({ ok: true })
}
