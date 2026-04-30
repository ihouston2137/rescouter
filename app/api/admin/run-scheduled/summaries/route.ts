import { getSession } from '@/lib/session'
import { syncActiveSummaries } from '@/lib/syncActive'

export async function POST() {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await syncActiveSummaries()
    return Response.json({ ...result, message: `Done — ${result.summariesCount} summaries generated across ${result.activeEvents} active events.` })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
