import { notFound } from 'next/navigation'
import Link from 'next/link'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import FrcTeam from '@/lib/models/Team'
import EventTeams from '@/lib/models/EventTeams'
import Ranking from '@/lib/models/Ranking'
import Match from '@/lib/models/Match'
import EventTeamAllianceSummary from '@/lib/models/EventTeamAllianceSummary'
import EventTeamAllianceSummaryLatest from '@/lib/models/EventTeamAllianceSummaryLatest'
import ScoutRadiozSummary from '@/lib/models/ScoutRadiozSummary'
import FrcSchedule from '@/lib/models/FrcSchedule'
import EventPage from './EventPage'
import type { EventDetail, TeamRow, RankingRow, MatchRow, AllianceSummaryRow, ScheduleRow } from './EventPage'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  await connectDB()

  const eventDoc = await FrcEvent.findOne({ code })
    .select('-_id code name city stateProv country dateStart dateEnd districtCode season')
    .lean()

  if (!eventDoc) notFound()

  const season = eventDoc.season as number

  // Parallel fetch
  const [eventTeamDocs, rankingDocs, matchDocs, allianceSummaryDocs, srzCount, scheduleDocs] = await Promise.all([
    EventTeams.find({ eventCode: code, season }).select('-_id teamNumber').lean(),
    Ranking.find({ eventCode: code, season })
      .sort({ rank: 1 })
      .select('-_id teamNumber rank wins losses ties sortOrder1 sortOrder2 sortOrder3 sortOrder4 sortOrder5 sortOrder6')
      .lean(),
    Match.find({ eventCode: code, season })
      .select('-_id matchNumber tournamentLevel description scoreRedFinal scoreBlueFinal teams')
      .lean(),
    EventTeamAllianceSummary.find({ eventCode: code, season })
      .sort({ adjustedFinalMedian: -1, finalMedian: -1 })
      .select('-_id teamNumber autoMin autoQ1 autoMedian autoQ3 autoMax finalMin finalQ1 finalMedian finalQ3 finalMax adjustedAutoMin adjustedAutoQ1 adjustedAutoMedian adjustedAutoQ3 adjustedAutoMax adjustedFinalMin adjustedFinalQ1 adjustedFinalMedian adjustedFinalQ3 adjustedFinalMax')
      .lean(),
    ScoutRadiozSummary.countDocuments({ eventCode: code.toUpperCase() }),
    FrcSchedule.find({ eventCode: code, season })
      .sort({ tournamentLevel: 1, matchNumber: 1 })
      .select('-_id tournamentLevel matchNumber description startTime teams')
      .lean(),
  ])

  // Pre-Analysis tab — latest summaries for teams attending this event
  const eventTeamNumbers = (eventTeamDocs as any[]).map((e: any) => e.teamNumber as number)
  const latestSummaryDocs = eventTeamNumbers.length > 0
    ? await EventTeamAllianceSummaryLatest.find({
        season,
        teamNumber: { $in: eventTeamNumbers },
      })
        .select('-_id teamNumber autoMin autoQ1 autoMedian autoQ3 autoMax finalMin finalQ1 finalMedian finalQ3 finalMax adjustedAutoMin adjustedAutoQ1 adjustedAutoMedian adjustedAutoQ3 adjustedAutoMax adjustedFinalMin adjustedFinalQ1 adjustedFinalMedian adjustedFinalQ3 adjustedFinalMax')
        .lean()
    : []

  // Single FrcTeam lookup for all team numbers used across both tabs
  const teamNumberSet = new Set<number>([
    ...eventTeamNumbers,
    ...(rankingDocs as any[]).map((r: any) => r.teamNumber as number),
  ])
  const teamDocs =
    teamNumberSet.size > 0
      ? await FrcTeam.find({ teamNumber: { $in: [...teamNumberSet] }, season })
          .select('-_id teamNumber nameShort city stateProv rookieYear')
          .lean()
      : []
  const teamMap = new Map((teamDocs as any[]).map((t: any) => [t.teamNumber as number, t as any]))

  // Teams tab
  const teams: TeamRow[] = (eventTeamDocs as any[])
    .map((e: any) => {
      const t = teamMap.get(e.teamNumber as number)
      return {
        teamNumber: e.teamNumber as number,
        nameShort: (t?.nameShort as string | undefined) ?? null,
        city: (t?.city as string | undefined) ?? null,
        stateProv: (t?.stateProv as string | undefined) ?? null,
        rookieYear: (t?.rookieYear as number | undefined) ?? null,
      }
    })
    .sort((a, b) => a.teamNumber - b.teamNumber)

  // Rankings tab
  const rankings: RankingRow[] = (rankingDocs as any[]).map((r: any) => ({
    teamNumber: r.teamNumber as number,
    nameShort: (teamMap.get(r.teamNumber as number)?.nameShort as string | undefined) ?? null,
    rank: r.rank as number,
    wins: (r.wins as number) ?? 0,
    losses: (r.losses as number) ?? 0,
    ties: (r.ties as number) ?? 0,
    sortOrder1: (r.sortOrder1 as number | undefined) ?? null,
    sortOrder2: (r.sortOrder2 as number | undefined) ?? null,
    sortOrder3: (r.sortOrder3 as number | undefined) ?? null,
    sortOrder4: (r.sortOrder4 as number | undefined) ?? null,
    sortOrder5: (r.sortOrder5 as number | undefined) ?? null,
    sortOrder6: (r.sortOrder6 as number | undefined) ?? null,
  }))

  // Matches tab — sorted by meaningful tournament level order, then match number
  const levelOrder: Record<string, number> = { Qualification: 1, Playoff: 2, Final: 3 }
  const matches: MatchRow[] = (matchDocs as any[])
    .map((m: any) => ({
      matchNumber: m.matchNumber as number,
      tournamentLevel: m.tournamentLevel as string,
      description: (m.description as string | undefined) ?? null,
      scoreRedFinal: (m.scoreRedFinal as number | undefined) ?? null,
      scoreBlueFinal: (m.scoreBlueFinal as number | undefined) ?? null,
      teams: (m.teams ?? []).map((t: any) => ({
        teamNumber: t.teamNumber as number,
        station:    t.station as string,
        dq:         Boolean(t.dq),
      })),
    }))
    .sort((a, b) => {
      const diff = (levelOrder[a.tournamentLevel] ?? 0) - (levelOrder[b.tournamentLevel] ?? 0)
      return diff !== 0 ? diff : a.matchNumber - b.matchNumber
    })

  // Analysis tab
  const allianceSummaries: AllianceSummaryRow[] = (allianceSummaryDocs as any[]).map(mapSummaryDoc)

  function mapSummaryDoc(s: any): AllianceSummaryRow {
    return {
      teamNumber: s.teamNumber as number,
      autoMin:    (s.autoMin    as number | undefined) ?? null,
      autoQ1:     (s.autoQ1    as number | undefined) ?? null,
      autoMedian: (s.autoMedian as number | undefined) ?? null,
      autoQ3:     (s.autoQ3    as number | undefined) ?? null,
      autoMax:    (s.autoMax   as number | undefined) ?? null,
      finalMin:    (s.finalMin    as number | undefined) ?? null,
      finalQ1:     (s.finalQ1    as number | undefined) ?? null,
      finalMedian: (s.finalMedian as number | undefined) ?? null,
      finalQ3:     (s.finalQ3    as number | undefined) ?? null,
      finalMax:    (s.finalMax   as number | undefined) ?? null,
      adjustedAutoMin:    (s.adjustedAutoMin    as number | undefined) ?? null,
      adjustedAutoQ1:     (s.adjustedAutoQ1     as number | undefined) ?? null,
      adjustedAutoMedian: (s.adjustedAutoMedian as number | undefined) ?? null,
      adjustedAutoQ3:     (s.adjustedAutoQ3     as number | undefined) ?? null,
      adjustedAutoMax:    (s.adjustedAutoMax    as number | undefined) ?? null,
      adjustedFinalMin:    (s.adjustedFinalMin    as number | undefined) ?? null,
      adjustedFinalQ1:     (s.adjustedFinalQ1     as number | undefined) ?? null,
      adjustedFinalMedian: (s.adjustedFinalMedian as number | undefined) ?? null,
      adjustedFinalQ3:     (s.adjustedFinalQ3     as number | undefined) ?? null,
      adjustedFinalMax:    (s.adjustedFinalMax    as number | undefined) ?? null,
    }
  }

  const latestAllianceSummaries: AllianceSummaryRow[] = (latestSummaryDocs as any[]).map(mapSummaryDoc)

  const scheduledMatches: ScheduleRow[] = (scheduleDocs as any[]).map((s: any) => ({
    tournamentLevel: s.tournamentLevel as string,
    matchNumber:     s.matchNumber as number,
    description:     (s.description as string | undefined) ?? null,
    startTime:       (() => {
      const v = s.startTime
      if (v == null) return null
      if (typeof v === 'string') return v
      // Old doc stored as BSON Date before schema change — extract YYYY-MM-DDTHH:MM:SS
      return new Date(v as unknown as Date).toISOString().slice(0, 19)
    })(),
    teams: (s.teams ?? []).map((t: any) => ({
      teamNumber: t.teamNumber as number,
      station:    t.station as string,
      surrogate:  Boolean(t.surrogate),
    })),
  }))

  const event: EventDetail = {
    code: eventDoc.code as string,
    name: (eventDoc.name as string | undefined) ?? '',
    city: (eventDoc.city as string | undefined) ?? null,
    stateProv: (eventDoc.stateProv as string | undefined) ?? null,
    country: (eventDoc.country as string | undefined) ?? null,
    dateStart: eventDoc.dateStart ? (eventDoc.dateStart as Date).toISOString() : null,
    dateEnd: eventDoc.dateEnd ? (eventDoc.dateEnd as Date).toISOString() : null,
    districtCode: (eventDoc.districtCode as string | undefined) ?? null,
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Link
          href="/events"
          className="mb-6 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          ← Events
        </Link>
        <EventPage
          event={event}
          teams={teams}
          rankings={rankings}
          matches={matches}
          allianceSummaries={allianceSummaries}
          latestAllianceSummaries={latestAllianceSummaries}
          hasSrzData={srzCount > 0}
          scheduledMatches={scheduledMatches}
        />
      </div>
    </div>
  )
}
