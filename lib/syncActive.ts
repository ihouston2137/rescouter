import connectDB from './db'
import FrcEvent from './models/Event'
import Ranking from './models/Ranking'
import Match from './models/Match'
import { fetchEventRankings, fetchEventMatches } from './frc'

export async function syncActiveEvents() {
  await connectDB()

  const now = new Date()
  const activeEvents = await FrcEvent.find({
    dateStart: { $lte: now },
    dateEnd: { $gte: now },
  })
    .select('code season')
    .lean()

  let rankingsCount = 0
  let matchesCount = 0
  let eventsProcessed = 0

  for (const event of activeEvents) {
    const eventCode = event.code as string
    const season = event.season as number

    try {
      const [rankings, matches] = await Promise.all([
        fetchEventRankings(eventCode, String(season)),
        fetchEventMatches(eventCode, String(season)),
      ])

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
          { upsert: true }
        )
        rankingsCount++
      }

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
          { upsert: true }
        )
        matchesCount++
      }

      eventsProcessed++
    } catch {
      // event not yet active or has no data — skip
    }
  }

  return {
    activeEvents: activeEvents.length,
    eventsProcessed,
    rankingsCount,
    matchesCount,
  }
}
