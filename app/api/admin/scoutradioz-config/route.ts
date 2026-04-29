import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import ScoutRadiozConfig from '@/lib/models/ScoutRadiozConfig'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const configs = await ScoutRadiozConfig.find({}).sort({ updatedAt: -1 }).lean()
  return Response.json(configs)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { _id, createdAt, updatedAt, ...fields } = body

  await connectDB()

  if (_id) {
    const doc = await ScoutRadiozConfig.findByIdAndUpdate(_id, { $set: fields }, { new: true }).lean()
    if (!doc) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json(doc)
  }

  const doc = await ScoutRadiozConfig.create(fields)
  return Response.json(doc.toObject())
}
