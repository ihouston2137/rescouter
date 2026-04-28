import EventTeamAllianceSummary from './models/EventTeamAllianceSummary'
import { computeAllianceContributions } from './allianceOPR'

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
    min:    sorted[0],
    q1:     lower.length > 0 ? median(lower) : sorted[0],
    median: median(sorted),
    q3:     upper.length > 0 ? median(upper) : sorted[n - 1],
    max:    sorted[n - 1],
  }
}

function asc(arr: number[]) {
  return [...arr].sort((a, b) => a - b)
}

export async function generateSummariesForEvents(
  events: Array<{ code: string; season: number }>,
): Promise<number> {
  let count = 0

  for (const event of events) {
    const { teams } = await computeAllianceContributions(event.code, event.season)

    for (const team of teams) {
      const allianceAuto  = asc(team.matches.map(m => m.allianceAutoScore))
      const allianceFinal = asc(team.matches.map(m => m.allianceFinalScore))
      const adjustedAuto  = asc(team.matches.map(m => m.adjustedAutoScore).filter((v): v is number => v !== null))
      const adjustedFinal = asc(team.matches.map(m => m.adjustedFinalScore).filter((v): v is number => v !== null))

      const autoStats          = fiveNumberSummary(allianceAuto)
      const finalStats         = fiveNumberSummary(allianceFinal)
      const adjustedAutoStats  = fiveNumberSummary(adjustedAuto)
      const adjustedFinalStats = fiveNumberSummary(adjustedFinal)

      if (!autoStats && !finalStats) continue

      await EventTeamAllianceSummary.findOneAndUpdate(
        { eventCode: event.code, season: event.season, teamNumber: team.teamNumber },
        {
          eventCode:  event.code,
          season:     event.season,
          teamNumber: team.teamNumber,
          ...(autoStats && {
            autoMin: autoStats.min, autoQ1: autoStats.q1, autoMedian: autoStats.median,
            autoQ3:  autoStats.q3,  autoMax: autoStats.max,
          }),
          ...(finalStats && {
            finalMin: finalStats.min, finalQ1: finalStats.q1, finalMedian: finalStats.median,
            finalQ3:  finalStats.q3,  finalMax: finalStats.max,
          }),
          ...(adjustedAutoStats && {
            adjustedAutoMin: adjustedAutoStats.min, adjustedAutoQ1: adjustedAutoStats.q1,
            adjustedAutoMedian: adjustedAutoStats.median, adjustedAutoQ3: adjustedAutoStats.q3,
            adjustedAutoMax: adjustedAutoStats.max,
          }),
          ...(adjustedFinalStats && {
            adjustedFinalMin: adjustedFinalStats.min, adjustedFinalQ1: adjustedFinalStats.q1,
            adjustedFinalMedian: adjustedFinalStats.median, adjustedFinalQ3: adjustedFinalStats.q3,
            adjustedFinalMax: adjustedFinalStats.max,
          }),
        },
        { upsert: true },
      )
      count++
    }
  }

  return count
}
