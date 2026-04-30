import connectDB from './db'
import FrcEvent from './models/Event'
import Ranking from './models/Ranking'
import Match from './models/Match'
import FrcSchedule from './models/FrcSchedule'
import { fetchEventRankings, fetchEventMatches, fetchEventSchedule } from './frc'
import { generateSummariesForEvents } from './generateAllianceSummaries'

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

async function getActiveEvents() {
  const now = new Date()
  return FrcEvent.find({ dateStart: { $lte: now }, dateEnd: { $gte: now } })
    .select('code season')
    .lean()
}

export async function syncActiveRankings() {
  await connectDB()
  const activeEvents = await getActiveEvents()
  let count = 0, eventsProcessed = 0
  for (const event of activeEvents) {
    const eventCode = event.code as string
    const season    = event.season as number
    try {
      const rankings = await fetchEventRankings(eventCode, String(season))
      for (const r of rankings) {
        await Ranking.findOneAndUpdate(
          { eventCode, season, teamNumber: r.teamNumber },
          {
            eventCode, season,
            teamNumber: r.teamNumber,
            rank: r.rank, wins: r.wins, losses: r.losses, ties: r.ties,
            matchesPlayed: r.matchesPlayed, dq: r.dq, qualAverage: r.qualAverage,
            sortOrder1: r.sortOrder1, sortOrder2: r.sortOrder2, sortOrder3: r.sortOrder3,
            sortOrder4: r.sortOrder4, sortOrder5: r.sortOrder5, sortOrder6: r.sortOrder6,
          },
          { upsert: true }
        )
        count++
      }
      eventsProcessed++
    } catch { /* no data yet — skip */ }
  }
  return { activeEvents: activeEvents.length, eventsProcessed, rankingsCount: count }
}

export async function syncActiveMatches() {
  await connectDB()
  const activeEvents = await getActiveEvents()
  let count = 0, eventsProcessed = 0
  for (const event of activeEvents) {
    const eventCode = event.code as string
    const season    = event.season as number
    try {
      const matches = await fetchEventMatches(eventCode, String(season))
      for (const m of matches) {
        await Match.findOneAndUpdate(
          { eventCode, season, tournamentLevel: m.tournamentLevel, matchNumber: m.matchNumber },
          {
            eventCode, season,
            matchNumber: m.matchNumber, tournamentLevel: m.tournamentLevel,
            description: m.description, isReplay: m.isReplay,
            matchVideoLink: m.matchVideoLink,
            scoreRedFinal: m.scoreRedFinal, scoreRedFoul: m.scoreRedFoul, scoreRedAuto: m.scoreRedAuto,
            scoreBlueFinal: m.scoreBlueFinal, scoreBlueFoul: m.scoreBlueFoul, scoreBlueAuto: m.scoreBlueAuto,
            autoStartTime:   m.autoStartTime   ? new Date(m.autoStartTime   as string) : undefined,
            actualStartTime: m.actualStartTime ? new Date(m.actualStartTime as string) : undefined,
            postResultTime:  m.postResultTime  ? new Date(m.postResultTime  as string) : undefined,
            teams: m.teams,
          },
          { upsert: true }
        )
        count++
      }
      eventsProcessed++
    } catch { /* no data yet — skip */ }
  }
  return { activeEvents: activeEvents.length, eventsProcessed, matchesCount: count }
}

export async function syncActiveSummaries() {
  await connectDB()
  const activeEvents = await getActiveEvents()
  const summariesCount = await generateSummariesForEvents(
    (activeEvents as any[]).map(e => ({ code: e.code as string, season: e.season as number }))
  )
  return { activeEvents: activeEvents.length, summariesCount }
}

export async function syncWeekSchedules() {
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

  let count = 0, eventsProcessed = 0
  for (const event of weekEvents) {
    const eventCode = event.code as string
    const season    = event.season as number
    try {
      const entries = await fetchEventSchedule(eventCode, String(season))
      const ops = entries.map((e) => ({
        updateOne: {
          filter: { eventCode, season, tournamentLevel: e.tournamentLevel as string, matchNumber: e.matchNumber as number },
          update: {
            $set: {
              eventCode, season,
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
    } catch { /* no schedule yet — skip */ }
  }
  return { weekEvents: weekEvents.length, eventsProcessed, scheduleCount: count }
}

export async function syncActiveEvents() {
  const [rankings, matches, summaries, schedules] = await Promise.all([
    syncActiveRankings(),
    syncActiveMatches(),
    syncActiveSummaries(),
    syncWeekSchedules(),
  ])
  return { ...rankings, ...matches, ...summaries, ...schedules }
}
