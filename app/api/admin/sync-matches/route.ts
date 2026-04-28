import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import Match from '@/lib/models/Match'
import { fetchEventMatches } from '@/lib/frc'

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
        const matches = await fetchEventMatches(eventCode, String(season))

        for (const m of matches) {
          await Match.findOneAndUpdate(
            { eventCode, season, tournamentLevel: m.tournamentLevel, matchNumber: m.matchNumber },
            {
              eventCode,
              season,
              matchNumber: m.matchNumber,
              tournamentLevel: m.tournamentLevel,
              description: m.description,
              isReplay: m.isReplay,
              matchVideoLink: m.matchVideoLink,
              scoreRedFinal: m.scoreRedFinal,
              scoreRedFoul: m.scoreRedFoul,
              scoreRedAuto: m.scoreRedAuto,
              scoreBlueFinal: m.scoreBlueFinal,
              scoreBlueFoul: m.scoreBlueFoul,
              scoreBlueAuto: m.scoreBlueAuto,
              autoStartTime: m.autoStartTime ? new Date(m.autoStartTime as string) : undefined,
              actualStartTime: m.actualStartTime ? new Date(m.actualStartTime as string) : undefined,
              postResultTime: m.postResultTime ? new Date(m.postResultTime as string) : undefined,
              teams: m.teams,
            },
            { upsert: true, returnDocument: 'after' }
          )
          count++
        }

        eventsProcessed++
      } catch {
        // event has no match results yet — skip and continue
      }
    }

    return Response.json({
      count,
      message: `Done — ${count} matches upserted across ${eventsProcessed} of ${pastEvents.length} events.`,
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
