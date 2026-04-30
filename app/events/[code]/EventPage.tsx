'use client'

import { useState } from 'react'
import {
  type AllianceSummaryRow,
  type ScoreMode,
  type Orientation,
  SCORE_MODES,
  ToggleSwitch,
  BoxPlotChart,
  SummaryTable,
} from '@/components/AnalysisView'
import SrzAnalysisTab from './SrzAnalysisTab'

// ── Types ────────────────────────────────────────────────────────────────────

export type EventDetail = {
  code: string
  name: string
  city: string | null
  stateProv: string | null
  country: string | null
  dateStart: string | null
  dateEnd: string | null
  districtCode: string | null
}

export type TeamRow = {
  teamNumber: number
  nameShort: string | null
  city: string | null
  stateProv: string | null
  rookieYear: number | null
}

export type RankingRow = {
  teamNumber: number
  nameShort: string | null
  rank: number
  wins: number
  losses: number
  ties: number
  sortOrder1: number | null
  sortOrder2: number | null
  sortOrder3: number | null
  sortOrder4: number | null
  sortOrder5: number | null
  sortOrder6: number | null
}

export type MatchRow = {
  matchNumber: number
  tournamentLevel: string
  description: string | null
  scoreRedFinal: number | null
  scoreBlueFinal: number | null
  teams: Array<{ teamNumber: number; station: string; dq: boolean }>
}

export type ScheduleRow = {
  matchNumber: number
  tournamentLevel: string
  description: string | null
  startTime: string | null
  teams: Array<{ teamNumber: number; station: string; surrogate: boolean }>
}

export type { AllianceSummaryRow } from '@/components/AnalysisView'

// ── Helpers ──────────────────────────────────────────────────────────────────

function utcFmt(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' })
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return '—'
  const short: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const year = new Date(start).getUTCFullYear()
  const startStr = utcFmt(start, short)
  if (!end) return `${startStr}, ${year}`
  const s = new Date(start)
  const e = new Date(end)
  if (s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear()) {
    return `${startStr} – ${e.getUTCDate()}, ${year}`
  }
  return `${startStr} – ${utcFmt(end, short)}, ${year}`
}

function formatLocation(city: string | null, stateProv: string | null, country: string | null) {
  const local = [city, stateProv].filter(Boolean).join(', ')
  return [local, country].filter(Boolean).join(' · ')
}

function AllianceCell({
  teams,
  color,
  winner,
}: {
  teams: MatchRow['teams']
  color: 'Red' | 'Blue'
  winner: boolean
}) {
  const slots = [1, 2, 3].map((n) => {
    const t = teams.find((t) => t.station === `${color}${n}`)
    const label = t ? `${t.teamNumber}${t.dq ? '*' : ''}` : '—'
    return (
      <span key={n} className={winner ? 'font-bold text-yellow-400' : undefined}>
        {label}
      </span>
    )
  })
  return <>{slots[0]}{' · '}{slots[1]}{' · '}{slots[2]}</>
}

// ── Table style constants ────────────────────────────────────────────────────

const TH = 'whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400'
const TD = 'whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300'

function EmptyRow({ cols, msg }: { cols: number; msg: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
        {msg}
      </td>
    </tr>
  )
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  )
}

// ── Teams table ──────────────────────────────────────────────────────────────

function TeamsTable({ teams }: { teams: TeamRow[] }) {
  return (
    <TableWrap>
      <thead>
        <tr className="border-b border-zinc-100 dark:border-zinc-800">
          <th className={TH}>#</th>
          <th className={TH}>Name</th>
          <th className={`${TH} hidden sm:table-cell`}>City</th>
          <th className={`${TH} hidden sm:table-cell`}>State/Prov</th>
          <th className={`${TH} hidden sm:table-cell`}>Rookie Year</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {teams.length === 0 ? (
          <EmptyRow cols={5} msg="No team data for this event." />
        ) : (
          teams.map((t) => (
            <tr key={t.teamNumber} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <td className={`${TD} font-medium`}>{t.teamNumber}</td>
              <td className={TD}>{t.nameShort ?? '—'}</td>
              <td className={`${TD} hidden sm:table-cell`}>{t.city ?? '—'}</td>
              <td className={`${TD} hidden sm:table-cell`}>{t.stateProv ?? '—'}</td>
              <td className={`${TD} hidden sm:table-cell`}>{t.rookieYear ?? '—'}</td>
            </tr>
          ))
        )}
      </tbody>
    </TableWrap>
  )
}

// ── Rankings table ───────────────────────────────────────────────────────────

function RankingsTable({ rankings }: { rankings: RankingRow[] }) {
  return (
    <TableWrap>
      <thead>
        <tr className="border-b border-zinc-100 dark:border-zinc-800">
          <th className={TH}>#</th>
          <th className={`${TH} hidden sm:table-cell`}>Name</th>
          <th className={TH}>Rank</th>
          <th className={TH}>W-L-T</th>
          <th className={TH}>RS 1</th>
          <th className={`${TH} hidden sm:table-cell`}>RS 2</th>
          <th className={`${TH} hidden md:table-cell`}>RS 3</th>
          <th className={`${TH} hidden lg:table-cell`}>RS 4</th>
          <th className={`${TH} hidden xl:table-cell`}>RS 5</th>
          <th className={`${TH} hidden 2xl:table-cell`}>RS 6</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {rankings.length === 0 ? (
          <EmptyRow cols={10} msg="No rankings data for this event." />
        ) : (
          rankings.map((r) => (
            <tr key={r.teamNumber} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <td className={`${TD} font-medium`}>{r.teamNumber}</td>
              <td className={`${TD} hidden sm:table-cell`}>{r.nameShort ?? '—'}</td>
              <td className={TD}>{r.rank}</td>
              <td className={`${TD} font-mono`}>{r.wins}-{r.losses}-{r.ties}</td>
              <td className={TD}>{r.sortOrder1 ?? '—'}</td>
              <td className={`${TD} hidden sm:table-cell`}>{r.sortOrder2 ?? '—'}</td>
              <td className={`${TD} hidden md:table-cell`}>{r.sortOrder3 ?? '—'}</td>
              <td className={`${TD} hidden lg:table-cell`}>{r.sortOrder4 ?? '—'}</td>
              <td className={`${TD} hidden xl:table-cell`}>{r.sortOrder5 ?? '—'}</td>
              <td className={`${TD} hidden 2xl:table-cell`}>{r.sortOrder6 ?? '—'}</td>
            </tr>
          ))
        )}
      </tbody>
    </TableWrap>
  )
}

// ── Schedule table ────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function ScheduleTable({
  rows,
  finalMedianMap,
}: {
  rows: ScheduleRow[]
  finalMedianMap: Map<number, number | null>
}) {
  if (rows.length === 0) return null

  // FRC API returns startTime as venue-local "YYYY-MM-DDTHH:MM:SS" with no TZ offset.
  // Split the string directly — no Date conversion needed.
  function fmtScheduleTime(raw: string) {
    const [datePart, timePart] = raw.split('T')
    const [, mo, dy] = datePart.split('-').map(Number)
    const [hh, mm]   = timePart.split(':').map(Number)
    const ampm = hh >= 12 ? 'PM' : 'AM'
    const h12  = hh % 12 || 12
    return `${MONTHS[mo - 1]} ${dy}  ${h12}:${mm.toString().padStart(2, '0')} ${ampm}`
  }

  function allianceTeams(teams: ScheduleRow['teams'], color: 'Red' | 'Blue') {
    return [1, 2, 3].map(n => {
      const t = teams.find(t => t.station === `${color}${n}`)
      return t ? `${t.teamNumber}${t.surrogate ? 'S' : ''}` : '—'
    }).join(' · ')
  }

  function allianceOpr(teams: ScheduleRow['teams'], color: 'Red' | 'Blue') {
    let total = 0, count = 0
    for (let n = 1; n <= 3; n++) {
      const t = teams.find(t => t.station === `${color}${n}`)
      if (t) {
        const val = finalMedianMap.get(t.teamNumber)
        if (val != null) { total += val; count++ }
      }
    }
    return count > 0 ? total.toFixed(1) : '—'
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
        Scheduled — no results yet ({rows.length})
      </h3>

      {/* Mobile: cards */}
      <div className="space-y-2 sm:hidden">
        {rows.map((m, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-1.5 dark:border-zinc-800">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{m.description ?? '—'}</span>
              {m.startTime && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {fmtScheduleTime(m.startTime)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-800">
              <div className="bg-red-50/50 p-3 dark:bg-red-950/10">
                <p className="font-mono text-xs text-red-700 dark:text-red-300">{allianceTeams(m.teams, 'Red')}</p>
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">OPR {allianceOpr(m.teams, 'Red')}</p>
              </div>
              <div className="bg-blue-50/50 p-3 dark:bg-blue-950/10">
                <p className="font-mono text-xs text-blue-700 dark:text-blue-300">{allianceTeams(m.teams, 'Blue')}</p>
                <p className="mt-1 text-xs text-blue-500 dark:text-blue-400">OPR {allianceOpr(m.teams, 'Blue')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block">
        <TableWrap>
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className={TH}>Match</th>
              <th className={TH}>Start Time</th>
              <th className={`${TH} bg-red-50 text-red-600 dark:bg-red-950/25 dark:text-red-400`}>Red Alliance</th>
              <th className={`${TH} bg-red-50 text-red-600 dark:bg-red-950/25 dark:text-red-400`}>Red OPR</th>
              <th className={`${TH} bg-blue-50 text-blue-600 dark:bg-blue-950/25 dark:text-blue-400`}>Blue Alliance</th>
              <th className={`${TH} bg-blue-50 text-blue-600 dark:bg-blue-950/25 dark:text-blue-400`}>Blue OPR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((m, i) => (
              <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className={TD}>{m.description ?? '—'}</td>
                <td className={`${TD} tabular-nums text-zinc-400 dark:text-zinc-500`}>
                  {m.startTime ? fmtScheduleTime(m.startTime) : '—'}
                </td>
                <td className={`${TD} bg-red-50 font-mono text-red-700 dark:bg-red-950/25 dark:text-red-300`}>
                  {allianceTeams(m.teams, 'Red')}
                </td>
                <td className={`${TD} bg-red-50 tabular-nums text-red-700 dark:bg-red-950/25 dark:text-red-300`}>
                  {allianceOpr(m.teams, 'Red')}
                </td>
                <td className={`${TD} bg-blue-50 font-mono text-blue-700 dark:bg-blue-950/25 dark:text-blue-300`}>
                  {allianceTeams(m.teams, 'Blue')}
                </td>
                <td className={`${TD} bg-blue-50 tabular-nums text-blue-700 dark:bg-blue-950/25 dark:text-blue-300`}>
                  {allianceOpr(m.teams, 'Blue')}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </div>
    </div>
  )
}

// ── Matches table ────────────────────────────────────────────────────────────

function MatchesTable({ matches }: { matches: MatchRow[] }) {
  const visible = matches.filter((m) => m.tournamentLevel !== 'None')

  if (visible.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <p className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">No match data for this event.</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile: card layout */}
      <div className="space-y-2 sm:hidden">
        {visible.map((m, i) => {
          const redWins  = m.scoreRedFinal  != null && m.scoreBlueFinal != null && m.scoreRedFinal  > m.scoreBlueFinal
          const blueWins = m.scoreBlueFinal != null && m.scoreRedFinal  != null && m.scoreBlueFinal > m.scoreRedFinal
          const alliance = (color: 'Red' | 'Blue') =>
            [1, 2, 3].map(n => {
              const t = m.teams.find(t => t.station === `${color}${n}`)
              return t ? `${t.teamNumber}${t.dq ? '*' : ''}` : '—'
            }).join(' · ')
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-100 px-3 py-1.5 dark:border-zinc-800">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{m.description ?? '—'}</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-800">
                <div className="bg-red-50/70 p-3 dark:bg-red-950/20">
                  <p className="mb-1 font-mono text-xs leading-snug text-red-700 dark:text-red-300">{alliance('Red')}</p>
                  {m.scoreRedFinal != null
                    ? <p className={`text-2xl font-bold ${redWins ? 'text-red-700 dark:text-red-200' : 'text-red-400 dark:text-red-500'}`}>
                        {redWins && <span className="mr-0.5 text-base text-yellow-400">★</span>}{m.scoreRedFinal}
                      </p>
                    : <p className="text-sm text-zinc-400">—</p>
                  }
                </div>
                <div className="bg-blue-50/70 p-3 dark:bg-blue-950/20">
                  <p className="mb-1 font-mono text-xs leading-snug text-blue-700 dark:text-blue-300">{alliance('Blue')}</p>
                  {m.scoreBlueFinal != null
                    ? <p className={`text-2xl font-bold ${blueWins ? 'text-blue-700 dark:text-blue-200' : 'text-blue-400 dark:text-blue-500'}`}>
                        {blueWins && <span className="mr-0.5 text-base text-yellow-400">★</span>}{m.scoreBlueFinal}
                      </p>
                    : <p className="text-sm text-zinc-400">—</p>
                  }
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden sm:block">
        <TableWrap>
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className={TH}>Description</th>
              <th className={`${TH} bg-red-50 text-red-600 dark:bg-red-950/25 dark:text-red-400`}>Red Alliance</th>
              <th className={`${TH} bg-blue-50 text-blue-600 dark:bg-blue-950/25 dark:text-blue-400`}>Blue Alliance</th>
              <th className={`${TH} bg-red-50 text-red-600 dark:bg-red-950/25 dark:text-red-400`}>Red Score</th>
              <th className={`${TH} bg-blue-50 text-blue-600 dark:bg-blue-950/25 dark:text-blue-400`}>Blue Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visible.map((m, i) => {
              const redWins  = m.scoreRedFinal  != null && m.scoreBlueFinal != null && m.scoreRedFinal  > m.scoreBlueFinal
              const blueWins = m.scoreBlueFinal != null && m.scoreRedFinal  != null && m.scoreBlueFinal > m.scoreRedFinal
              return (
                <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className={TD}>{m.description ?? '—'}</td>
                  <td className={`${TD} bg-red-50 font-mono text-red-700 dark:bg-red-950/25 dark:text-red-300`}>
                    <AllianceCell teams={m.teams} color="Red" winner={redWins} />
                  </td>
                  <td className={`${TD} bg-blue-50 font-mono text-blue-700 dark:bg-blue-950/25 dark:text-blue-300`}>
                    <AllianceCell teams={m.teams} color="Blue" winner={blueWins} />
                  </td>
                  <td className={`${TD} bg-red-50 dark:bg-red-950/25`}>
                    {m.scoreRedFinal != null ? (
                      <span className={`text-red-700 dark:text-red-300 ${redWins ? 'text-base font-bold' : ''}`}>
                        {redWins && <span className="mr-1 text-yellow-400">★</span>}{m.scoreRedFinal}
                      </span>
                    ) : '—'}
                  </td>
                  <td className={`${TD} bg-blue-50 dark:bg-blue-950/25`}>
                    {m.scoreBlueFinal != null ? (
                      <span className={`text-blue-700 dark:text-blue-300 ${blueWins ? 'text-base font-bold' : ''}`}>
                        {blueWins && <span className="mr-1 text-yellow-400">★</span>}{m.scoreBlueFinal}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
      </div>
    </>
  )
}

// ── Analysis tab ─────────────────────────────────────────────────────────────

// BoxPlotChart and SummaryTable are imported from @/components/AnalysisView

function AnalysisTab({ summaries, emptyMessage }: { summaries: AllianceSummaryRow[]; emptyMessage?: string }) {
  const [mode, setMode]               = useState<ScoreMode>('adjustedFinal')
  const [orientation, setOrientation] = useState<Orientation>('horizontal')
  const [showTable, setShowTable]     = useState(false)

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Score type</span>
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
            {SCORE_MODES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  mode === id
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!showTable && (
          <ToggleSwitch
            checked={orientation === 'vertical'}
            onChange={v => setOrientation(v ? 'vertical' : 'horizontal')}
            labelOff="Horizontal"
            labelOn="Vertical"
          />
        )}

        <ToggleSwitch
          checked={showTable}
          onChange={setShowTable}
          labelOff="Chart"
          labelOn="Table"
        />
      </div>

      {/* Content */}
      {summaries.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
            {emptyMessage ?? 'No alliance summary data for this event. Run "Generate Alliance Data Summaries" in Data Processing first.'}
          </p>
        </div>
      ) : showTable ? (
        <SummaryTable summaries={summaries} mode={mode} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <BoxPlotChart summaries={summaries} mode={mode} orientation={orientation} />
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

type Tab = 'teams' | 'rankings' | 'matches' | 'pre-analysis' | 'analysis' | 'srz-analysis'

const TABS: { id: Tab; label: string }[] = [
  { id: 'teams',        label: 'Teams' },
  { id: 'rankings',     label: 'Rankings' },
  { id: 'matches',      label: 'Matches' },
  { id: 'pre-analysis', label: 'Pre-Analysis' },
  { id: 'analysis',     label: 'Analysis' },
  { id: 'srz-analysis', label: 'SRz Analysis' },
]

export default function EventPage({
  event,
  teams,
  rankings,
  matches,
  allianceSummaries,
  latestAllianceSummaries,
  hasSrzData,
  scheduledMatches,
}: {
  event: EventDetail
  teams: TeamRow[]
  rankings: RankingRow[]
  matches: MatchRow[]
  allianceSummaries: AllianceSummaryRow[]
  latestAllianceSummaries: AllianceSummaryRow[]
  hasSrzData: boolean
  scheduledMatches: ScheduleRow[]
}) {
  const eventEnded = event.dateEnd ? new Date(event.dateEnd) < new Date() : false

  // team → finalMedian: latest summaries as base, event summaries override
  const finalMedianMap = new Map<number, number | null>()
  for (const s of latestAllianceSummaries) finalMedianMap.set(s.teamNumber, s.finalMedian)
  for (const s of allianceSummaries)       finalMedianMap.set(s.teamNumber, s.finalMedian)

  // Schedule entries that don't yet have a scored match record
  const scoredKeys = new Set(
    matches
      .filter(m => m.scoreRedFinal != null || m.scoreBlueFinal != null)
      .map(m => `${m.tournamentLevel}:${m.matchNumber}`)
  )
  const unscoredSchedule = scheduledMatches.filter(
    s => !scoredKeys.has(`${s.tournamentLevel}:${s.matchNumber}`)
  )

  const visibleTabs = TABS.filter(t => {
    if (t.id === 'pre-analysis' && eventEnded) return false
    if (t.id === 'srz-analysis' && !hasSrzData)  return false
    return true
  })

  const [activeTab, setActiveTab]     = useState<Tab>('teams')
  const [teamFilter, setTeamFilter]   = useState('')

  const teamFilterNum = parseInt(teamFilter, 10)
  const hasFilter     = teamFilter.trim() !== '' && !isNaN(teamFilterNum)

  const filteredMatches  = hasFilter
    ? matches.filter(m => m.teams.some(t => t.teamNumber === teamFilterNum))
    : matches
  const filteredSchedule = hasFilter
    ? unscoredSchedule.filter(s => s.teams.some(t => t.teamNumber === teamFilterNum))
    : unscoredSchedule

  const loc   = formatLocation(event.city, event.stateProv, event.country)
  const dates = formatDateRange(event.dateStart, event.dateEnd)

  return (
    <div>
      {/* Event header */}
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {event.name || event.code}
      </h1>
      {loc && <p className="text-sm text-zinc-500 dark:text-zinc-400">{loc}</p>}
      <p className="mb-8 text-sm text-zinc-400 dark:text-zinc-500">
        {dates}
        {event.districtCode ? ` · ${event.districtCode}` : ''}
      </p>

      {/* Tab bar — horizontally scrollable on small screens */}
      <div className="mb-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-zinc-200 dark:border-zinc-800">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`shrink-0 whitespace-nowrap -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'teams'        && <TeamsTable    teams={teams} />}
      {activeTab === 'rankings'     && <RankingsTable rankings={rankings} />}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              placeholder="Filter by team number…"
              className="h-9 w-48 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder:text-zinc-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            {hasFilter && (
              <button
                onClick={() => setTeamFilter('')}
                className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Clear
              </button>
            )}
          </div>
          <div className="space-y-6">
            <ScheduleTable rows={filteredSchedule} finalMedianMap={finalMedianMap} />
            <MatchesTable matches={filteredMatches} />
          </div>
        </div>
      )}
      {activeTab === 'pre-analysis' && (
        <AnalysisTab
          summaries={latestAllianceSummaries}
          emptyMessage='No latest summary data for these teams. Run "Get Latest Alliance Data Summaries" in Data Processing first.'
        />
      )}
      {activeTab === 'analysis'     && <AnalysisTab   summaries={allianceSummaries} />}
      {activeTab === 'srz-analysis' && <SrzAnalysisTab eventCode={event.code} />}
    </div>
  )
}
