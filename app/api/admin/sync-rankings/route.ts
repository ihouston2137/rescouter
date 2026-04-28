import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import Ranking from '@/lib/models/Ranking'
import { fetchEventRankings } from '@/lib/frc'

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

    let count = 0
    let eventsProcessed = 0

    for (const event of pastEvents) {
      const eventCode = event.code as string
      const season = event.season as number

      try {
        const rankings = await fetchEventRankings(eventCode, String(season))

        for (const r of rankings) {
          await Ranking.findOneAndUpdate(
            { eventCode, season, teamNumber: r.teamNumber },
            {
              eventCode,
              season,
              teamNumber: r.teamNumber,
              rank: r.rank,
              wins: r.wins,
              losses: r.losses,
              ties: r.ties,
              matchesPlayed: r.matchesPlayed,
              dq: r.dq,
              qualAverage: r.qualAverage,
              sortOrder1: r.sortOrder1,
              sortOrder2: r.sortOrder2,
              sortOrder3: r.sortOrder3,
              sortOrder4: r.sortOrder4,
              sortOrder5: r.sortOrder5,
              sortOrder6: r.sortOrder6,
            },
            { upsert: true, returnDocument: 'after' }
          )
          count++
        }

        eventsProcessed++
      } catch {
        // event has no rankings yet — skip and continue
      }
    }

    return Response.json({
      count,
      message: `Done — ${count} rankings upserted across ${eventsProcessed} of ${pastEvents.length} events.`,
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
