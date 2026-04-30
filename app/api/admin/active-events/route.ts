import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const now = new Date()
  const day  = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  monday.setUTCHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  sunday.setUTCHours(23, 59, 59, 999)

  const events = await FrcEvent.find({
    dateStart: { $lte: sunday },
    $or: [
      { dateEnd: { $gte: monday } },
      { dateEnd: null },
      { dateEnd: { $exists: false } },
    ],
  })
    .select('-_id code name')
    .sort({ code: 1 })
    .lean()

  return Response.json(events)
}
