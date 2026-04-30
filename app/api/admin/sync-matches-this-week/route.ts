import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import Match from '@/lib/models/Match'
import { fetchEventMatches } from '@/lib/frc'

function currentWeekBounds(): { monday: Date; sunday: Date } {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  monday.setUTCHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  sunday.setUTCHours(23, 59, 59, 999)
  return { monday, sunday }
}

export async function POST() {
  const session = await getSession()
  if (!session?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()

    const { monday, sunday } = currentWeekBounds()

    // Events that overlap with the current week: start on or before Sunday AND end on or after Monday
    const weekEvents = await FrcEvent.find({
      dateStart: { $lte: sunday },
      $or: [
        { dateEnd: { $gte: monday } },
        { dateEnd: null },
        { dateEnd: { $exists: false } },
      ],
    })
      .select('code season dateStart dateEnd')
      .lean()

    let count = 0
    let eventsProcessed = 0
    const errors: { eventCode: string; error: string }[] = []
    const eventCodes = (weekEvents as any[]).map((e: any) => e.code as string)

    for (const event of weekEvents) {
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

        if (matches.length > 0) eventsProcessed++
      } catch (err) {
        errors.push({ eventCode, error: (err as Error).message })
      }
    }

    return Response.json({
      count,
      weekEvents: weekEvents.length,
      eventCodes,
      eventsProcessed,
      errors,

      message: `Done — ${count} matches upserted across ${eventsProcessed} of ${weekEvents.length} this-week events.${errors.length ? ` ${errors.length} event(s) errored.` : ''}`,
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
