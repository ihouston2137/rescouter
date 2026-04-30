import { getSession } from '@/lib/session'
import { syncActiveRankings } from '@/lib/syncActive'

export async function POST() {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await syncActiveRankings()
    return Response.json({ ...result, message: `Done — ${result.rankingsCount} rankings upserted across ${result.eventsProcessed} of ${result.activeEvents} active events.` })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
