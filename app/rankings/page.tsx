import connectDB from '@/lib/db'
import EventTeamAllianceSummaryLatest from '@/lib/models/EventTeamAllianceSummaryLatest'
import type { AllianceSummaryRow } from '@/components/AnalysisView'
import RankingsPage from './RankingsPage'

export default async function WorldRankingsPage() {
  await connectDB()

  // Find the latest season that has data
  const latestSeasonDoc = await EventTeamAllianceSummaryLatest
    .findOne({})
    .sort({ season: -1 })
    .select('season')
    .lean() as { season: number } | null

  if (!latestSeasonDoc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          No ranking data available. Run "Get Latest Alliance Data Summaries" in Data Processing first.
        </p>
      </div>
    )
  }

  const season = latestSeasonDoc.season

  const docs = await EventTeamAllianceSummaryLatest
    .find({ season })
    .select('-_id teamNumber autoMin autoQ1 autoMedian autoQ3 autoMax finalMin finalQ1 finalMedian finalQ3 finalMax adjustedAutoMin adjustedAutoQ1 adjustedAutoMedian adjustedAutoQ3 adjustedAutoMax adjustedFinalMin adjustedFinalQ1 adjustedFinalMedian adjustedFinalQ3 adjustedFinalMax')
    .lean() as any[]

  const summaries: AllianceSummaryRow[] = docs.map(d => ({
    teamNumber:          d.teamNumber          as number,
    autoMin:             (d.autoMin             as number | undefined) ?? null,
    autoQ1:              (d.autoQ1              as number | undefined) ?? null,
    autoMedian:          (d.autoMedian          as number | undefined) ?? null,
    autoQ3:              (d.autoQ3              as number | undefined) ?? null,
    autoMax:             (d.autoMax             as number | undefined) ?? null,
    finalMin:            (d.finalMin            as number | undefined) ?? null,
    finalQ1:             (d.finalQ1             as number | undefined) ?? null,
    finalMedian:         (d.finalMedian         as number | undefined) ?? null,
    finalQ3:             (d.finalQ3             as number | undefined) ?? null,
    finalMax:            (d.finalMax            as number | undefined) ?? null,
    adjustedAutoMin:     (d.adjustedAutoMin     as number | undefined) ?? null,
    adjustedAutoQ1:      (d.adjustedAutoQ1      as number | undefined) ?? null,
    adjustedAutoMedian:  (d.adjustedAutoMedian  as number | undefined) ?? null,
    adjustedAutoQ3:      (d.adjustedAutoQ3      as number | undefined) ?? null,
    adjustedAutoMax:     (d.adjustedAutoMax     as number | undefined) ?? null,
    adjustedFinalMin:    (d.adjustedFinalMin    as number | undefined) ?? null,
    adjustedFinalQ1:     (d.adjustedFinalQ1     as number | undefined) ?? null,
    adjustedFinalMedian: (d.adjustedFinalMedian as number | undefined) ?? null,
    adjustedFinalQ3:     (d.adjustedFinalQ3     as number | undefined) ?? null,
    adjustedFinalMax:    (d.adjustedFinalMax    as number | undefined) ?? null,
  }))

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <RankingsPage summaries={summaries} season={season} />
      </div>
    </div>
  )
}
