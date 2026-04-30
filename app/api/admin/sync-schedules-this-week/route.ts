import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import FrcSchedule from '@/lib/models/FrcSchedule'
import { fetchEventSchedule } from '@/lib/frc'

function currentWeekBounds(): { monday: Date; sunday: Date } {
  const now = new Date()
  const day = now.getUTCDay()
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

    const weekEvents = await FrcEvent.find({
      dateStart: { $lte: sunday },
      $or: [
        { dateEnd: { $gte: monday } },
        { dateEnd: null },
        { dateEnd: { $exists: false } },
      ],
    })
      .select('code season')
      .lean()

    let count = 0
    let eventsProcessed = 0

    for (const event of weekEvents) {
      const eventCode = event.code as string
      const season    = event.season as number

      try {
        const entries = await fetchEventSchedule(eventCode, String(season))

        const ops = entries.map((e) => ({
          updateOne: {
            filter: {
              eventCode,
              season,
              tournamentLevel: e.tournamentLevel as string,
              matchNumber: e.matchNumber as number,
            },
            update: {
              $set: {
                eventCode,
                season,
                tournamentLevel: e.tournamentLevel as string,
                matchNumber:     e.matchNumber as number,
                description:     e.description as string | undefined,
                startTime:       (e.startTime as string | undefined) ?? undefined,
                field:           e.field as string | undefined,
                teams:           e.teams as object[] | undefined,
              },
            },
            upsert: true,
          },
        }))

        if (ops.length > 0) {
          await FrcSchedule.bulkWrite(ops, { ordered: false })
          count += ops.length
          eventsProcessed++
        }
      } catch {
        // skip events with no schedule yet
      }
    }

    return Response.json({
      count,
      message: `Done — ${count} schedule entries upserted across ${eventsProcessed} of ${weekEvents.length} this-week events.`,
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
