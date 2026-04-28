'use client'

import { useState } from 'react'

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

export type AllianceSummaryRow = {
  teamNumber: number
  autoMin: number | null
  autoQ1: number | null
  autoMedian: number | null
  autoQ3: number | null
  autoMax: number | null
  finalMin: number | null
  finalQ1: number | null
  finalMedian: number | null
  finalQ3: number | null
  finalMax: number | null
}

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

type ScoreMode = 'final' | 'auto'

const FINAL_UPPER  = '#3b82f6'  // blue-500  (Q3 → median)
const FINAL_LOWER  = '#93c5fd'  // blue-300  (median → Q1)
const FINAL_STROKE = '#1d4ed8'  // blue-700
const AUTO_UPPER   = '#f59e0b'  // amber-500 (Q3 → median)
const AUTO_LOWER   = '#fcd34d'  // amber-300 (median → Q1)
const AUTO_STROKE  = '#b45309'  // amber-700

type Orientation = 'vertical' | 'horizontal'

function ToggleSwitch({
  checked,
  onChange,
  labelOff,
  labelOn,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  labelOff: string
  labelOn: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium transition-colors ${!checked ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}`}>
        {labelOff}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 ${
          checked ? 'bg-zinc-700 dark:bg-zinc-300' : 'bg-zinc-300 dark:bg-zinc-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <span className={`text-xs font-medium transition-colors ${checked ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}`}>
        {labelOn}
      </span>
    </div>
  )
}

function BoxPlotChart({
  summaries,
  mode,
  orientation,
}: {
  summaries: AllianceSummaryRow[]
  mode: ScoreMode
  orientation: Orientation
}) {
  const getStats = (s: AllianceSummaryRow) =>
    mode === 'final'
      ? { min: s.finalMin, q1: s.finalQ1, median: s.finalMedian, q3: s.finalQ3, max: s.finalMax }
      : { min: s.autoMin,  q1: s.autoQ1,  median: s.autoMedian,  q3: s.autoQ3,  max: s.autoMax  }

  // Always sort highest → lowest by the active mode's max
  const sorted = [...summaries].sort((a, b) => {
    const aMax = (mode === 'final' ? a.finalMax : a.autoMax) ?? -Infinity
    const bMax = (mode === 'final' ? b.finalMax : b.autoMax) ?? -Infinity
    return bMax - aMax
  })

  const allMins  = sorted.map(s => getStats(s).min).filter((v): v is number => v != null)
  const allMaxes = sorted.map(s => getStats(s).max).filter((v): v is number => v != null)
  const globalMin = allMins.length  > 0 ? Math.min(...allMins)  : 0
  const globalMax = allMaxes.length > 0 ? Math.max(...allMaxes) : 100
  const range = globalMax - globalMin || 1

  const upperColor = mode === 'final' ? FINAL_UPPER  : AUTO_UPPER
  const lowerColor = mode === 'final' ? FINAL_LOWER  : AUTO_LOWER
  const boxStroke  = mode === 'final' ? FINAL_STROKE : AUTO_STROKE

  const tickCount = 5
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round(globalMin + (i / tickCount) * range)
  )

  // ── Vertical layout (teams left→right, scores bottom→top) ──────────────────
  if (orientation === 'vertical') {
    const COL_W  = 20
    const BOX_W  = 12
    const LEFT   = 40
    const RIGHT  = 12
    const TOP    = 16
    const BOT    = 48
    const PLOT_H = 320
    const SVG_W  = LEFT + sorted.length * COL_W + RIGHT
    const SVG_H  = TOP + PLOT_H + BOT

    const toY  = (v: number) => TOP + PLOT_H - ((v - globalMin) / range) * PLOT_H
    const colX = (i: number) => LEFT + i * COL_W + COL_W / 2

    return (
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: '100%', maxWidth: SVG_W, height: 'auto' }}
          aria-label={`${mode === 'final' ? 'Final' : 'Auto'} score vertical box plot`}
        >
          {ticks.map((tick, idx) => {
            const y = toY(tick)
            return (
              <g key={idx}>
                <line x1={LEFT} y1={y} x2={LEFT + sorted.length * COL_W} y2={y}
                  stroke="#94a3b8" strokeOpacity={0.2} strokeWidth={1} />
                <text x={LEFT - 6} y={y + 4} textAnchor="end"
                  fontSize={13} fontWeight="bold" fill="#64748b">
                  {tick}
                </text>
              </g>
            )
          })}

          <line x1={LEFT} y1={TOP} x2={LEFT} y2={TOP + PLOT_H}
            stroke="#94a3b8" strokeOpacity={0.3} strokeWidth={1} />

          {sorted.map((s, i) => {
            const stats   = getStats(s)
            const cx      = colX(i)
            const hasData = stats.min != null && stats.q1 != null &&
              stats.median != null && stats.q3 != null && stats.max != null

            return (
              <g key={s.teamNumber}>
                <text
                  transform={`translate(${cx},${TOP + PLOT_H + 6}) rotate(-90)`}
                  textAnchor="end" dominantBaseline="middle"
                  fontSize={13} fontWeight="bold" fill="#64748b"
                >
                  {s.teamNumber}
                </text>
                {hasData ? (
                  <>
                    <line x1={cx} y1={toY(stats.max!)} x2={cx} y2={toY(stats.min!)}
                      stroke={boxStroke} strokeWidth={1.5} />
                    <line x1={cx - 5} y1={toY(stats.max!)} x2={cx + 5} y2={toY(stats.max!)}
                      stroke={boxStroke} strokeWidth={1.5} />
                    <line x1={cx - 5} y1={toY(stats.min!)} x2={cx + 5} y2={toY(stats.min!)}
                      stroke={boxStroke} strokeWidth={1.5} />
                    <rect x={cx - BOX_W / 2} y={toY(stats.q3!)} width={BOX_W}
                      height={Math.max(1, toY(stats.median!) - toY(stats.q3!))}
                      fill={upperColor} stroke={boxStroke} strokeWidth={1} />
                    <rect x={cx - BOX_W / 2} y={toY(stats.median!)} width={BOX_W}
                      height={Math.max(1, toY(stats.q1!) - toY(stats.median!))}
                      fill={lowerColor} stroke={boxStroke} strokeWidth={1} />
                  </>
                ) : (
                  <text x={cx} y={TOP + PLOT_H / 2} textAnchor="middle" fontSize={9} fill="#94a3b8">—</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  // ── Horizontal layout (teams top→bottom, scores left→right) ────────────────
  const BOX_H  = 14
  const LEFT   = 48
  const RIGHT  = 16
  const TOP    = 28
  const BOT    = 12
  const ROW_H  = 32
  const PLOT_W = 440
  const SVG_W  = LEFT + PLOT_W + RIGHT
  const SVG_H  = TOP + sorted.length * ROW_H + BOT

  const toX  = (v: number) => LEFT + ((v - globalMin) / range) * PLOT_W
  const rowY = (i: number) => TOP + i * ROW_H + ROW_H / 2

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: '100%', maxWidth: SVG_W, height: 'auto' }}
        aria-label={`${mode === 'final' ? 'Final' : 'Auto'} score horizontal box plot`}
      >
        {ticks.map((tick, idx) => {
          const x = toX(tick)
          return (
            <g key={idx}>
              <line x1={x} y1={TOP - 6} x2={x} y2={TOP + sorted.length * ROW_H}
                stroke="#94a3b8" strokeOpacity={0.2} strokeWidth={1} />
              <text x={x} y={TOP - 9} textAnchor="middle"
                fontSize={13} fontWeight="bold" fill="#64748b">
                {tick}
              </text>
            </g>
          )
        })}

        <line x1={LEFT} y1={TOP} x2={LEFT + PLOT_W} y2={TOP}
          stroke="#94a3b8" strokeOpacity={0.3} strokeWidth={1} />

        {sorted.map((s, i) => {
          const stats   = getStats(s)
          const cy      = rowY(i)
          const hasData = stats.min != null && stats.q1 != null &&
            stats.median != null && stats.q3 != null && stats.max != null

          return (
            <g key={s.teamNumber}>
              <text x={LEFT - 6} y={cy + 4} textAnchor="end"
                fontSize={13} fontWeight="bold" fill="#64748b">
                {s.teamNumber}
              </text>
              {hasData ? (
                <>
                  <line x1={toX(stats.min!)} y1={cy} x2={toX(stats.max!)} y2={cy}
                    stroke={boxStroke} strokeWidth={1.5} />
                  <line x1={toX(stats.min!)} y1={cy - 5} x2={toX(stats.min!)} y2={cy + 5}
                    stroke={boxStroke} strokeWidth={1.5} />
                  <line x1={toX(stats.max!)} y1={cy - 5} x2={toX(stats.max!)} y2={cy + 5}
                    stroke={boxStroke} strokeWidth={1.5} />
                  {/* Left half: Q1 → median (lower scores = lighter shade) */}
                  <rect x={toX(stats.q1!)} y={cy - BOX_H / 2}
                    width={Math.max(1, toX(stats.median!) - toX(stats.q1!))} height={BOX_H}
                    fill={lowerColor} stroke={boxStroke} strokeWidth={1} />
                  {/* Right half: median → Q3 (higher scores = darker shade) */}
                  <rect x={toX(stats.median!)} y={cy - BOX_H / 2}
                    width={Math.max(1, toX(stats.q3!) - toX(stats.median!))} height={BOX_H}
                    fill={upperColor} stroke={boxStroke} strokeWidth={1} />
                </>
              ) : (
                <text x={LEFT + 8} y={cy + 4} fontSize={9} fill="#94a3b8">—</text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function AnalysisTab({ summaries }: { summaries: AllianceSummaryRow[] }) {
  const [mode, setMode]               = useState<ScoreMode>('final')
  const [orientation, setOrientation] = useState<Orientation>('vertical')

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Score type</span>
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
            {(['final', 'auto'] as ScoreMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  mode === m
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <ToggleSwitch
          checked={orientation === 'vertical'}
          onChange={v => setOrientation(v ? 'vertical' : 'horizontal')}
          labelOff="Horizontal"
          labelOn="Vertical"
        />
      </div>

      {/* Chart card */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {summaries.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
            No alliance summary data for this event. Run &ldquo;Generate Alliance Data Summaries&rdquo; in Data Processing first.
          </p>
        ) : (
          <BoxPlotChart summaries={summaries} mode={mode} orientation={orientation} />
        )}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

type Tab = 'teams' | 'rankings' | 'matches' | 'analysis'

const TABS: { id: Tab; label: string }[] = [
  { id: 'teams',    label: 'Teams' },
  { id: 'rankings', label: 'Rankings' },
  { id: 'matches',  label: 'Matches' },
  { id: 'analysis', label: 'Analysis' },
]

export default function EventPage({
  event,
  teams,
  rankings,
  matches,
  allianceSummaries,
}: {
  event: EventDetail
  teams: TeamRow[]
  rankings: RankingRow[]
  matches: MatchRow[]
  allianceSummaries: AllianceSummaryRow[]
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
      {activeTab === 'teams'    && <TeamsTable    teams={teams} />}
      {activeTab === 'rankings' && <RankingsTable rankings={rankings} />}
      {activeTab === 'matches'  && <MatchesTable  matches={matches} />}
      {activeTab === 'analysis' && <AnalysisTab   summaries={allianceSummaries} />}
    </div>
  )
}
