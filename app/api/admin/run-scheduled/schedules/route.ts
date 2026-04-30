import { getSession } from '@/lib/session'
import { syncWeekSchedules } from '@/lib/syncActive'

export async function POST() {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await syncWeekSchedules()
    return Response.json({ ...result, message: `Done — ${result.scheduleCount} schedule entries upserted across ${result.eventsProcessed} of ${result.weekEvents} this-week events.` })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
