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
          <th className={TH}>City</th>
          <th className={TH}>State/Prov</th>
          <th className={TH}>Rookie Year</th>
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
              <td className={TD}>{t.city ?? '—'}</td>
              <td className={TD}>{t.stateProv ?? '—'}</td>
              <td className={TD}>{t.rookieYear ?? '—'}</td>
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
          <th className={TH}>Name</th>
          <th className={TH}>Rank</th>
          <th className={TH}>W-L-T</th>
          {/* Sort order columns: progressively revealed by breakpoint */}
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
              <td className={TD}>{r.nameShort ?? '—'}</td>
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

// ── Matches table ────────────────────────────────────────────────────────────

function MatchesTable({ matches }: { matches: MatchRow[] }) {
  const visible = matches.filter((m) => m.tournamentLevel !== 'None')

  return (
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
        {visible.length === 0 ? (
          <EmptyRow cols={5} msg="No match data for this event." />
        ) : (
          visible.map((m, i) => {
            const redWins =
              m.scoreRedFinal != null &&
              m.scoreBlueFinal != null &&
              m.scoreRedFinal > m.scoreBlueFinal
            const blueWins =
              m.scoreRedFinal != null &&
              m.scoreBlueFinal != null &&
              m.scoreBlueFinal > m.scoreRedFinal

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
                      {redWins && <span className="mr-1 text-yellow-400">★</span>}
                      {m.scoreRedFinal}
                    </span>
                  ) : '—'}
                </td>
                <td className={`${TD} bg-blue-50 dark:bg-blue-950/25`}>
                  {m.scoreBlueFinal != null ? (
                    <span className={`text-blue-700 dark:text-blue-300 ${blueWins ? 'text-base font-bold' : ''}`}>
                      {blueWins && <span className="mr-1 text-yellow-400">★</span>}
                      {m.scoreBlueFinal}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            )
          })
        )}
      </tbody>
    </TableWrap>
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
      <div className="mb-4 flex flex-wrap items-center gap-4">
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

type Tab = 'teams' | 'rankings' | 'matches' | 'pre-analysis' | 'analysis'

const TABS: { id: Tab; label: string }[] = [
  { id: 'teams',        label: 'Teams' },
  { id: 'rankings',     label: 'Rankings' },
  { id: 'matches',      label: 'Matches' },
  { id: 'pre-analysis', label: 'Pre-Analysis' },
  { id: 'analysis',     label: 'Analysis' },
]

export default function EventPage({
  event,
  teams,
  rankings,
  matches,
  allianceSummaries,
  latestAllianceSummaries,
}: {
  event: EventDetail
  teams: TeamRow[]
  rankings: RankingRow[]
  matches: MatchRow[]
  allianceSummaries: AllianceSummaryRow[]
  latestAllianceSummaries: AllianceSummaryRow[]
}) {
  const [activeTab, setActiveTab] = useState<Tab>('teams')

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

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
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
      {activeTab === 'matches'      && <MatchesTable  matches={matches} />}
      {activeTab === 'pre-analysis' && (
        <AnalysisTab
          summaries={latestAllianceSummaries}
          emptyMessage='No latest summary data for these teams. Run "Get Latest Alliance Data Summaries" in Data Processing first.'
        />
      )}
      {activeTab === 'analysis'     && <AnalysisTab   summaries={allianceSummaries} />}
    </div>
  )
}
