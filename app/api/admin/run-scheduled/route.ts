import { getSession } from '@/lib/session'
import { syncActiveEvents } from '@/lib/syncActive'

export async function POST() {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await syncActiveEvents()
    return Response.json({ ...result, message: `Done — ${result.rankingsCount ?? 0} rankings, ${result.matchesCount ?? 0} matches, ${result.summariesCount ?? 0} summaries, ${result.scheduleCount ?? 0} schedule entries.` })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
