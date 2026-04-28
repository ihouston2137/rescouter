import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import { generateSummariesForEvents } from '@/lib/generateAllianceSummaries'

export async function POST() {
  const session = await getSession()
  if (!session?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()

    const pastEvents = await FrcEvent.find({ dateStart: { $lt: new Date() } })
      .select('code season')
      .lean()

    const events = (pastEvents as any[]).map(e => ({
      code:   e.code   as string,
      season: e.season as number,
    }))

    const count = await generateSummariesForEvents(events)

    return Response.json({
      count,
      message: `Done — ${count} alliance summaries generated across ${events.length} events.`,
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
