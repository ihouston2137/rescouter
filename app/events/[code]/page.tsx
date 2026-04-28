import { notFound } from 'next/navigation'
import Link from 'next/link'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import FrcTeam from '@/lib/models/Team'
import EventTeams from '@/lib/models/EventTeams'
import Ranking from '@/lib/models/Ranking'
import Match from '@/lib/models/Match'
import EventPage from './EventPage'
import type { EventDetail, TeamRow, RankingRow, MatchRow } from './EventPage'

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
  const [eventTeamDocs, rankingDocs, matchDocs] = await Promise.all([
    EventTeams.find({ eventCode: code, season }).select('-_id teamNumber').lean(),
    Ranking.find({ eventCode: code, season })
      .sort({ rank: 1 })
      .select('-_id teamNumber rank wins losses ties sortOrder1 sortOrder2 sortOrder3 sortOrder4 sortOrder5 sortOrder6')
      .lean(),
    Match.find({ eventCode: code, season })
      .select('-_id matchNumber tournamentLevel description scoreRedFinal scoreBlueFinal teams')
      .lean(),
  ])

  // Single FrcTeam lookup for all team numbers used across both tabs
  const teamNumberSet = new Set<number>([
    ...(eventTeamDocs as any[]).map((e: any) => e.teamNumber as number),
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
      teams: (m.teams ?? []) as Array<{ teamNumber: number; station: string; dq: boolean }>,
    }))
    .sort((a, b) => {
      const diff = (levelOrder[a.tournamentLevel] ?? 0) - (levelOrder[b.tournamentLevel] ?? 0)
      return diff !== 0 ? diff : a.matchNumber - b.matchNumber
    })

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
          className="mb-6 inline-block text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Events
        </Link>
        <EventPage event={event} teams={teams} rankings={rankings} matches={matches} />
      </div>
    </div>
  )
}
