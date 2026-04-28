import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import EventTeams from '@/lib/models/EventTeams'
import TeamEvents from '@/lib/models/TeamEvents'
import { fetchEventTeams } from '@/lib/frc'

export async function POST() {
  const session = await getSession()
  if (!session?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()

    const events = await FrcEvent.find({}).select('code season').lean()

    let count = 0
    let eventsProcessed = 0

    for (const event of events) {
      const eventCode = event.code as string
      const season = event.season as number

      try {
        const teams = await fetchEventTeams(eventCode, String(season))

        for (const t of teams) {
          const teamNumber = t.teamNumber as number
          const filter = { eventCode, season, teamNumber }

          await Promise.all([
            EventTeams.findOneAndUpdate(filter, filter, { upsert: true }),
            TeamEvents.findOneAndUpdate(
              { teamNumber, season, eventCode },
              { teamNumber, season, eventCode },
              { upsert: true }
            ),
          ])

          count++
        }

        eventsProcessed++
      } catch {
        // event has no team list yet — skip
      }
    }

    return Response.json({
      count,
      message: `Done — ${count} team-event links upserted across ${eventsProcessed} of ${events.length} events.`,
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
