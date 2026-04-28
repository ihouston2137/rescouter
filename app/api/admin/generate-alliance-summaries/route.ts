import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import EventTeams from '@/lib/models/EventTeams'
import Match from '@/lib/models/Match'
import EventTeamAllianceSummary from '@/lib/models/EventTeamAllianceSummary'

type MatchDoc = {
  scoreRedAuto?: number
  scoreRedFinal?: number
  scoreBlueAuto?: number
  scoreBlueFinal?: number
  teams: { teamNumber: number; station: string; dq: boolean }[]
}

function fiveNumberSummary(sorted: number[]) {
  const n = sorted.length
  if (n === 0) return null

  function median(arr: number[]): number {
    const mid = Math.floor(arr.length / 2)
    return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid]
  }

  const mid = Math.floor(n / 2)
  const lower = sorted.slice(0, mid)
  const upper = n % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1)

  return {
    min: sorted[0],
    q1: lower.length > 0 ? median(lower) : sorted[0],
    median: median(sorted),
    q3: upper.length > 0 ? median(upper) : sorted[n - 1],
    max: sorted[n - 1],
  }
}

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

    for (const event of pastEvents) {
      const eventCode = event.code as string
      const season = event.season as number

      const eventTeams = await EventTeams.find({ eventCode, season })
        .select('teamNumber')
        .lean()

      for (const et of eventTeams) {
        const teamNumber = et.teamNumber as number

        const matches = await Match.find({
          eventCode,
          season,
          'teams.teamNumber': teamNumber,
        }).lean() as MatchDoc[]

        const autoScores: number[] = []
        const finalScores: number[] = []

        for (const match of matches) {
          const teamEntry = match.teams.find(t => t.teamNumber === teamNumber)
          if (!teamEntry) continue

          const isRed = teamEntry.station.startsWith('Red')
          const autoScore = isRed ? match.scoreRedAuto : match.scoreBlueAuto
          const finalScore = isRed ? match.scoreRedFinal : match.scoreBlueFinal

          if (typeof autoScore === 'number') autoScores.push(autoScore)
          if (typeof finalScore === 'number') finalScores.push(finalScore)
        }

        autoScores.sort((a, b) => a - b)
        finalScores.sort((a, b) => a - b)

        const autoStats = fiveNumberSummary(autoScores)
        const finalStats = fiveNumberSummary(finalScores)

        if (!autoStats && !finalStats) continue

        await EventTeamAllianceSummary.findOneAndUpdate(
          { eventCode, season, teamNumber },
          {
            eventCode,
            season,
            teamNumber,
            ...(autoStats && {
              autoMin: autoStats.min,
              autoQ1: autoStats.q1,
              autoMedian: autoStats.median,
              autoQ3: autoStats.q3,
              autoMax: autoStats.max,
            }),
            ...(finalStats && {
              finalMin: finalStats.min,
              finalQ1: finalStats.q1,
              finalMedian: finalStats.median,
              finalQ3: finalStats.q3,
              finalMax: finalStats.max,
            }),
          },
          { upsert: true }
        )
        count++
      }
    }

    return Response.json({
      count,
      message: `Done — ${count} alliance summaries generated across ${pastEvents.length} events.`,
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
