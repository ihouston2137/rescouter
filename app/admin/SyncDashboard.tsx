'use client'

import { useState } from 'react'

type SyncResult = { count?: number; message?: string; error?: string }

function SyncCard({
  title,
  description,
  onSync,
  loading,
  result,
}: {
  title: string
  description: string
  onSync: () => void
  loading: boolean
  result: SyncResult | null
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-1 text-lg font-medium text-zinc-900 dark:text-zinc-50">{title}</h2>
      <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      <button
        onClick={onSync}
        disabled={loading}
        className="h-10 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? 'Syncing…' : `Sync ${title}`}
      </button>
      {result && (
        <p className={`mt-4 text-sm ${result.error ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {result.error
            ? `Error: ${result.error}`
            : result.message ?? `Done — ${result.count} ${title.toLowerCase()} upserted.`}
        </p>
      )}
    </div>
  )
}

export default function SyncDashboard({ season }: { season: string }) {
  const [eventResult, setEventResult] = useState<SyncResult | null>(null)
  const [teamResult, setTeamResult] = useState<SyncResult | null>(null)
  const [rankingResult, setRankingResult] = useState<SyncResult | null>(null)
  const [matchResult, setMatchResult] = useState<SyncResult | null>(null)
  const [weekMatchResult, setWeekMatchResult] = useState<SyncResult | null>(null)
  const [weekScheduleResult, setWeekScheduleResult] = useState<SyncResult | null>(null)
  const [eventTeamsResult, setEventTeamsResult] = useState<SyncResult | null>(null)
  const [syncingEvents, setSyncingEvents] = useState(false)
  const [syncingTeams, setSyncingTeams] = useState(false)
  const [syncingRankings, setSyncingRankings] = useState(false)
  const [syncingMatches, setSyncingMatches] = useState(false)
  const [syncingWeekMatches, setSyncingWeekMatches] = useState(false)
  const [syncingWeekSchedule, setSyncingWeekSchedule] = useState(false)
  const [syncingEventTeams, setSyncingEventTeams] = useState(false)

  async function syncEvents() {
    setSyncingEvents(true)
    setEventResult(null)
    try {
      const res = await fetch('/api/admin/sync-events', { method: 'POST' })
      setEventResult(await res.json())
    } catch {
      setEventResult({ error: 'Network error' })
    } finally {
      setSyncingEvents(false)
    }
  }

  async function syncTeams() {
    setSyncingTeams(true)
    setTeamResult(null)
    try {
      const res = await fetch('/api/admin/sync-teams', { method: 'POST' })
      setTeamResult(await res.json())
    } catch {
      setTeamResult({ error: 'Network error' })
    } finally {
      setSyncingTeams(false)
    }
  }

  async function syncRankings() {
    setSyncingRankings(true)
    setRankingResult(null)
    try {
      const res = await fetch('/api/admin/sync-rankings', { method: 'POST' })
      setRankingResult(await res.json())
    } catch {
      setRankingResult({ error: 'Network error' })
    } finally {
      setSyncingRankings(false)
    }
  }

  async function syncMatches() {
    setSyncingMatches(true)
    setMatchResult(null)
    try {
      const res = await fetch('/api/admin/sync-matches', { method: 'POST' })
      setMatchResult(await res.json())
    } catch {
      setMatchResult({ error: 'Network error' })
    } finally {
      setSyncingMatches(false)
    }
  }

  async function syncWeekMatches() {
    setSyncingWeekMatches(true)
    setWeekMatchResult(null)
    try {
      const res = await fetch('/api/admin/sync-matches-this-week', { method: 'POST' })
      setWeekMatchResult(await res.json())
    } catch {
      setWeekMatchResult({ error: 'Network error' })
    } finally {
      setSyncingWeekMatches(false)
    }
  }

  async function syncWeekSchedule() {
    setSyncingWeekSchedule(true)
    setWeekScheduleResult(null)
    try {
      const res = await fetch('/api/admin/sync-schedules-this-week', { method: 'POST' })
      setWeekScheduleResult(await res.json())
    } catch {
      setWeekScheduleResult({ error: 'Network error' })
    } finally {
      setSyncingWeekSchedule(false)
    }
  }

  async function syncEventTeams() {
    setSyncingEventTeams(true)
    setEventTeamsResult(null)
    try {
      const res = await fetch('/api/admin/sync-event-teams', { method: 'POST' })
      setEventTeamsResult(await res.json())
    } catch {
      setEventTeamsResult({ error: 'Network error' })
    } finally {
      setSyncingEventTeams(false)
    }
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <SyncCard
        title="Events"
        description={`Pull all ${season} FRC events from the API and upsert into MongoDB.`}
        onSync={syncEvents}
        loading={syncingEvents}
        result={eventResult}
      />
      <SyncCard
        title="Teams"
        description={`Pull all ${season} FRC teams (all pages) and upsert into MongoDB.`}
        onSync={syncTeams}
        loading={syncingTeams}
        result={teamResult}
      />
      <SyncCard
        title="Rankings"
        description="Pull rankings from all events in the database whose start date is in the past."
        onSync={syncRankings}
        loading={syncingRankings}
        result={rankingResult}
      />
      <SyncCard
        title="Matches"
        description="Pull match results from all events in the database whose start date is in the past."
        onSync={syncMatches}
        loading={syncingMatches}
        result={matchResult}
      />
      <SyncCard
        title="This Week's Matches"
        description="Pull match results only for events overlapping the current calendar week (Mon–Sun)."
        onSync={syncWeekMatches}
        loading={syncingWeekMatches}
        result={weekMatchResult}
      />
      <SyncCard
        title="This Week's Schedule"
        description="Pull match schedules (Qualification + Playoff) for events overlapping the current calendar week and store in frcschedules."
        onSync={syncWeekSchedule}
        loading={syncingWeekSchedule}
        result={weekScheduleResult}
      />
      <SyncCard
        title="Event Teams"
        description="Pull team rosters for every event in the database and upsert into teams-by-event and events-by-team collections."
        onSync={syncEventTeams}
        loading={syncingEventTeams}
        result={eventTeamsResult}
      />
    </div>
  )
}
