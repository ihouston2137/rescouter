import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import ScoutRadiozProcessed from '@/lib/models/ScoutRadiozProcessed'

const EDITABLE_FIELDS = new Set([
  'startPosition', 'endgameClimbLevel',
  'autoScoredFuel', 'autoCycles', 'autoScore', 'autoClimb',
  'teleScoredFuel', 'teleFuelCycles', 'teleScore', 'totalScore', 'telePassCycles',
  'endgameClimb', 'passNeutral', 'passOpposite', 'beached',
  'stuckTrench', 'stuckBump', 'damaged', 'died', 'tipped',
  'accuracyRating', 'skillRating', 'defenseRating',
])

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json() as Record<string, unknown>

  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (EDITABLE_FIELDS.has(k)) update[k] = v
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  await connectDB()
  const doc = await ScoutRadiozProcessed.findByIdAndUpdate(id, { $set: update }, { new: true }).lean()
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({ ok: true, doc })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()
  const doc = await ScoutRadiozProcessed.findByIdAndDelete(id)
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({ ok: true })
}
