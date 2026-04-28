'use client'

import { useState, useRef, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

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
  adjustedAutoMin: number | null
  adjustedAutoQ1: number | null
  adjustedAutoMedian: number | null
  adjustedAutoQ3: number | null
  adjustedAutoMax: number | null
  adjustedFinalMin: number | null
  adjustedFinalQ1: number | null
  adjustedFinalMedian: number | null
  adjustedFinalQ3: number | null
  adjustedFinalMax: number | null
}

export type ScoreMode = 'adjustedFinal' | 'adjustedAuto' | 'final' | 'auto'

export const SCORE_MODES: { id: ScoreMode; label: string }[] = [
  { id: 'adjustedFinal', label: 'OPR Final' },
  { id: 'adjustedAuto',  label: 'OPR Auto'  },
  { id: 'final',         label: 'Final'      },
  { id: 'auto',          label: 'Auto'       },
]

export type Orientation = 'vertical' | 'horizontal'

export type StatKey = 'min' | 'q1' | 'median' | 'q3' | 'max'
export type TableSortKey = 'teamNumber' | StatKey

// ── Color constants ───────────────────────────────────────────────────────────

const FINAL_UPPER      = '#3b82f6'
const FINAL_LOWER      = '#93c5fd'
const FINAL_STROKE     = '#1d4ed8'
const AUTO_UPPER       = '#f59e0b'
const AUTO_LOWER       = '#fcd34d'
const AUTO_STROKE      = '#b45309'
const OPR_FINAL_UPPER  = '#10b981'
const OPR_FINAL_LOWER  = '#6ee7b7'
const OPR_FINAL_STROKE = '#047857'
const OPR_AUTO_UPPER   = '#8b5cf6'
const OPR_AUTO_LOWER   = '#c4b5fd'
const OPR_AUTO_STROKE  = '#6d28d9'

// ── Table primitives ──────────────────────────────────────────────────────────

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

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getStatsByMode(s: AllianceSummaryRow, mode: ScoreMode): Record<StatKey, number | null> {
  switch (mode) {
    case 'adjustedFinal': return { min: s.adjustedFinalMin, q1: s.adjustedFinalQ1, median: s.adjustedFinalMedian, q3: s.adjustedFinalQ3, max: s.adjustedFinalMax }
    case 'adjustedAuto':  return { min: s.adjustedAutoMin,  q1: s.adjustedAutoQ1,  median: s.adjustedAutoMedian,  q3: s.adjustedAutoQ3,  max: s.adjustedAutoMax  }
    case 'final':         return { min: s.finalMin,         q1: s.finalQ1,         median: s.finalMedian,         q3: s.finalQ3,         max: s.finalMax         }
    case 'auto':          return { min: s.autoMin,          q1: s.autoQ1,          median: s.autoMedian,          q3: s.autoQ3,          max: s.autoMax          }
  }
}

// ── ToggleSwitch ──────────────────────────────────────────────────────────────

export function ToggleSwitch({
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

// ── BoxPlotChart ──────────────────────────────────────────────────────────────

export function BoxPlotChart({
  summaries,
  mode,
  orientation,
}: {
  summaries: AllianceSummaryRow[]
  mode: ScoreMode
  orientation: Orientation
}) {
  type Stats = { min: number | null; q1: number | null; median: number | null; q3: number | null; max: number | null }

  const [hoverInfo, setHoverInfo] = useState<{ teamNumber: number; stats: Stats; x: number; y: number } | null>(null)
  const [pinnedTeam, setPinnedTeam] = useState<{ teamNumber: number; stats: Stats } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function handleTouch(teamNumber: number, stats: Stats) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setPinnedTeam({ teamNumber, stats })
    timerRef.current = setTimeout(() => setPinnedTeam(null), 10000)
  }

  function closePinned() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setPinnedTeam(null)
  }

  const getStats = (s: AllianceSummaryRow): Stats => {
    switch (mode) {
      case 'adjustedFinal': return { min: s.adjustedFinalMin, q1: s.adjustedFinalQ1, median: s.adjustedFinalMedian, q3: s.adjustedFinalQ3, max: s.adjustedFinalMax }
      case 'adjustedAuto':  return { min: s.adjustedAutoMin,  q1: s.adjustedAutoQ1,  median: s.adjustedAutoMedian,  q3: s.adjustedAutoQ3,  max: s.adjustedAutoMax  }
      case 'final':         return { min: s.finalMin,         q1: s.finalQ1,         median: s.finalMedian,         q3: s.finalQ3,         max: s.finalMax         }
      case 'auto':          return { min: s.autoMin,          q1: s.autoQ1,          median: s.autoMedian,          q3: s.autoQ3,          max: s.autoMax          }
    }
  }

  const sorted = [...summaries].sort((a, b) => (getStats(b).median ?? -Infinity) - (getStats(a).median ?? -Infinity))

  const allMins  = sorted.map(s => getStats(s).min).filter((v): v is number => v != null)
  const allMaxes = sorted.map(s => getStats(s).max).filter((v): v is number => v != null)
  const globalMin = allMins.length  > 0 ? Math.min(...allMins)  : 0
  const globalMax = allMaxes.length > 0 ? Math.max(...allMaxes) : 100
  const range = globalMax - globalMin || 1

  const [upperColor, lowerColor, boxStroke] = (() => {
    switch (mode) {
      case 'adjustedFinal': return [OPR_FINAL_UPPER, OPR_FINAL_LOWER, OPR_FINAL_STROKE]
      case 'adjustedAuto':  return [OPR_AUTO_UPPER,  OPR_AUTO_LOWER,  OPR_AUTO_STROKE]
      case 'final':         return [FINAL_UPPER,      FINAL_LOWER,     FINAL_STROKE]
      case 'auto':          return [AUTO_UPPER,       AUTO_LOWER,      AUTO_STROKE]
    }
  })()

  const tickCount = 5
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round(globalMin + (i / tickCount) * range)
  )

  const STAT_ROWS: Array<[string, keyof Stats]> = [
    ['Max',    'max'],
    ['Q3',     'q3'],
    ['Median', 'median'],
    ['Q1',     'q1'],
    ['Min',    'min'],
  ]

  const hoverTooltip = hoverInfo && (
    <div
      className="pointer-events-none fixed z-50 min-w-32.5 rounded-lg border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
      style={{ left: hoverInfo.x + 14, top: hoverInfo.y - 10 }}
    >
      <p className="mb-2 text-xs font-bold text-zinc-900 dark:text-zinc-50">Team {hoverInfo.teamNumber}</p>
      <table className="w-full text-xs">
        <tbody>
          {STAT_ROWS.map(([label, key]) => {
            const val = hoverInfo.stats[key]
            return (
              <tr key={label}>
                <td className="pr-4 text-zinc-500 dark:text-zinc-400">{label}</td>
                <td className="text-right font-mono font-semibold text-zinc-800 dark:text-zinc-100">
                  {val != null ? val.toFixed(1) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  const mobilePopup = pinnedTeam && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50"
      onClick={closePinned}
    >
      <div
        className="relative w-56 rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closePinned}
          aria-label="Close"
          className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
          </svg>
        </button>
        <p className="mb-3 pr-5 text-sm font-bold text-zinc-900 dark:text-zinc-50">Team {pinnedTeam.teamNumber}</p>
        <table className="w-full text-sm">
          <tbody>
            {STAT_ROWS.map(([label, key]) => {
              const val = pinnedTeam.stats[key]
              return (
                <tr key={label}>
                  <td className="py-0.5 pr-6 text-zinc-500 dark:text-zinc-400">{label}</td>
                  <td className="py-0.5 text-right font-mono font-semibold text-zinc-800 dark:text-zinc-100">
                    {val != null ? val.toFixed(1) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ── Vertical layout ───────────────────────────────────────────────────────────
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
      <>
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ width: '100%', maxWidth: SVG_W, height: 'auto' }}
            aria-label="Score vertical box plot"
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
                  <rect
                    x={LEFT + i * COL_W} y={TOP}
                    width={COL_W} height={PLOT_H}
                    fill="transparent"
                    style={{ cursor: hasData ? 'crosshair' : 'default' }}
                    onMouseEnter={(e) => { if (hasData) setHoverInfo({ teamNumber: s.teamNumber, stats, x: e.clientX, y: e.clientY }) }}
                    onMouseMove={(e) => { if (hasData) setHoverInfo(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null) }}
                    onMouseLeave={() => setHoverInfo(null)}
                    onTouchStart={() => { if (hasData) handleTouch(s.teamNumber, stats) }}
                  />
                </g>
              )
            })}
          </svg>
        </div>
        {hoverTooltip}
        {mobilePopup}
      </>
    )
  }

  // ── Horizontal layout ─────────────────────────────────────────────────────────
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
    <>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: '100%', maxWidth: SVG_W, height: 'auto' }}
          aria-label="Score horizontal box plot"
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
                    <rect x={toX(stats.q1!)} y={cy - BOX_H / 2}
                      width={Math.max(1, toX(stats.median!) - toX(stats.q1!))} height={BOX_H}
                      fill={lowerColor} stroke={boxStroke} strokeWidth={1} />
                    <rect x={toX(stats.median!)} y={cy - BOX_H / 2}
                      width={Math.max(1, toX(stats.q3!) - toX(stats.median!))} height={BOX_H}
                      fill={upperColor} stroke={boxStroke} strokeWidth={1} />
                  </>
                ) : (
                  <text x={LEFT + 8} y={cy + 4} fontSize={9} fill="#94a3b8">—</text>
                )}
                <rect
                  x={LEFT} y={TOP + i * ROW_H}
                  width={PLOT_W} height={ROW_H}
                  fill="transparent"
                  style={{ cursor: hasData ? 'crosshair' : 'default' }}
                  onMouseEnter={(e) => { if (hasData) setHoverInfo({ teamNumber: s.teamNumber, stats, x: e.clientX, y: e.clientY }) }}
                  onMouseMove={(e) => { if (hasData) setHoverInfo(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null) }}
                  onMouseLeave={() => setHoverInfo(null)}
                  onTouchStart={() => { if (hasData) handleTouch(s.teamNumber, stats) }}
                />
              </g>
            )
          })}
        </svg>
      </div>
      {hoverTooltip}
      {mobilePopup}
    </>
  )
}

// ── SummaryTable ──────────────────────────────────────────────────────────────

export function SummaryTable({
  summaries,
  mode,
  rowLabel = '#',
  rankOffset = 0,
}: {
  summaries: AllianceSummaryRow[]
  mode: ScoreMode
  rowLabel?: string
  rankOffset?: number
}) {
  const [sortKey, setSortKey] = useState<TableSortKey>('median')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => { setSortKey('median'); setSortDir('desc') }, [mode])

  function handleSort(key: TableSortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...summaries].sort((a, b) => {
    let av: number, bv: number
    if (sortKey === 'teamNumber') {
      av = a.teamNumber; bv = b.teamNumber
    } else {
      av = getStatsByMode(a, mode)[sortKey] ?? -Infinity
      bv = getStatsByMode(b, mode)[sortKey] ?? -Infinity
    }
    return sortDir === 'asc' ? av - bv : bv - av
  })

  const COLS: Array<{ key: TableSortKey; label: string }> = [
    { key: 'teamNumber', label: 'Team'   },
    { key: 'min',        label: 'MIN'    },
    { key: 'q1',         label: 'Q1'     },
    { key: 'median',     label: 'MEDIAN' },
    { key: 'q3',         label: 'Q3'     },
    { key: 'max',        label: 'MAX'    },
  ]

  return (
    <TableWrap>
      <thead>
        <tr className="border-b border-zinc-100 dark:border-zinc-800">
          <th className={TH}>{rowLabel}</th>
          {COLS.map(({ key, label }) => (
            <th
              key={key}
              onClick={() => handleSort(key)}
              className={`${TH} cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-200`}
            >
              <span className="flex items-center gap-1">
                {label}
                <span className={sortKey === key ? 'text-zinc-600 dark:text-zinc-300' : 'opacity-25'}>
                  {sortKey === key ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
                </span>
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {sorted.length === 0 ? (
          <EmptyRow cols={7} msg="No data." />
        ) : (
          sorted.map((s, i) => {
            const stats = getStatsByMode(s, mode)
            return (
              <tr key={s.teamNumber} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className={`${TD} tabular-nums text-zinc-400 dark:text-zinc-500`}>{rankOffset + i + 1}</td>
                <td className={`${TD} font-medium`}>{s.teamNumber}</td>
                <td className={`${TD} font-mono`}>{stats.min    != null ? stats.min.toFixed(1)    : '—'}</td>
                <td className={`${TD} font-mono`}>{stats.q1     != null ? stats.q1.toFixed(1)     : '—'}</td>
                <td className={`${TD} font-mono`}>{stats.median != null ? stats.median.toFixed(1) : '—'}</td>
                <td className={`${TD} font-mono`}>{stats.q3     != null ? stats.q3.toFixed(1)     : '—'}</td>
                <td className={`${TD} font-mono`}>{stats.max    != null ? stats.max.toFixed(1)    : '—'}</td>
              </tr>
            )
          })
        )}
      </tbody>
    </TableWrap>
  )
}
