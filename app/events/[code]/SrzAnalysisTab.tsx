'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type StatBlock = { min: number; q1: number; median: number; q3: number; max: number; avg: number }

type SrzSummary = {
  teamNumber:     number
  records:        number
  startPosition:  Record<string, number>
  autoScoredFuel: number; autoClimb: number; teleScoredFuel: number
  endgameClimb:   number; passNeutral: number; passOpposite: number
  beached:        number; stuckTrench: number; stuckBump: number
  damaged:        number; died: number; tipped: number
  autoCycles:     StatBlock; autoScore: StatBlock
  teleFuelCycles: StatBlock; teleScore: StatBlock; telePassCycles: StatBlock
  accuracyRating: StatBlock; skillRating: StatBlock; defenseRating: StatBlock
}

type ProcessedRec = {
  matchNumber: number; tournamentLevel: string
  startPosition?: string
  autoScoredFuel?: number; autoCycles?: number; autoScore?: number; autoClimb?: number
  teleScoredFuel?: number; teleFuelCycles?: number; teleScore?: number; telePassCycles?: number
  endgameClimb?: number; endgameClimbLevel?: string
  passNeutral?: number; passOpposite?: number
  beached?: number; stuckTrench?: number; stuckBump?: number
  damaged?: number; died?: number; tipped?: number
  accuracyRating?: number; skillRating?: number; defenseRating?: number
}

// ── Field definitions ─────────────────────────────────────────────────────────

type NumKey  = 'autoCycles' | 'autoScore' | 'teleFuelCycles' | 'teleScore' | 'telePassCycles' | 'accuracyRating' | 'skillRating' | 'defenseRating'
type BoolKey = 'autoScoredFuel' | 'autoClimb' | 'teleScoredFuel' | 'endgameClimb' | 'passNeutral' | 'passOpposite' | 'beached' | 'stuckTrench' | 'stuckBump' | 'damaged' | 'died' | 'tipped'

const NUM_FIELDS: { key: NumKey; label: string }[] = [
  { key: 'autoScore',      label: 'Auto Score' },
  { key: 'autoCycles',     label: 'Auto Cycles' },
  { key: 'teleScore',      label: 'Tele Score' },
  { key: 'teleFuelCycles', label: 'Tele Fuel Cycles' },
  { key: 'telePassCycles', label: 'Tele Pass Cycles' },
  { key: 'accuracyRating', label: 'Accuracy' },
  { key: 'skillRating',    label: 'Skill' },
  { key: 'defenseRating',  label: 'Defense' },
]

const BOOL_FIELDS: { key: BoolKey; label: string; higherIsWorse?: boolean }[] = [
  { key: 'autoScoredFuel', label: 'Auto Fuel' },
  { key: 'autoClimb',      label: 'Auto Climb' },
  { key: 'teleScoredFuel', label: 'Tele Fuel' },
  { key: 'endgameClimb',   label: 'Endgame Climb' },
  { key: 'passNeutral',    label: 'Pass Neutral' },
  { key: 'passOpposite',   label: 'Pass Opposite' },
  { key: 'beached',        label: 'Beached',      higherIsWorse: true },
  { key: 'stuckTrench',    label: 'Stuck Trench', higherIsWorse: true },
  { key: 'stuckBump',      label: 'Stuck Bump',   higherIsWorse: true },
  { key: 'damaged',        label: 'Damaged',      higherIsWorse: true },
  { key: 'died',           label: 'Died',         higherIsWorse: true },
  { key: 'tipped',         label: 'Tipped',       higherIsWorse: true },
]

const PROC_COLS: { key: keyof ProcessedRec; label: string; bool?: boolean }[] = [
  { key: 'startPosition',     label: 'Position' },
  { key: 'autoScoredFuel',    label: 'Auto Fuel',    bool: true },
  { key: 'autoCycles',        label: 'A.Cyc' },
  { key: 'autoScore',         label: 'A.Score' },
  { key: 'autoClimb',         label: 'A.Climb',      bool: true },
  { key: 'teleScoredFuel',    label: 'T.Fuel',       bool: true },
  { key: 'teleFuelCycles',    label: 'T.FCyc' },
  { key: 'teleScore',         label: 'T.Score' },
  { key: 'telePassCycles',    label: 'T.PCyc' },
  { key: 'endgameClimb',      label: 'EG Climb',     bool: true },
  { key: 'endgameClimbLevel', label: 'Climb Lvl' },
  { key: 'passNeutral',       label: 'Pass N',       bool: true },
  { key: 'passOpposite',      label: 'Pass O',       bool: true },
  { key: 'beached',           label: 'Beach',        bool: true },
  { key: 'stuckTrench',       label: 'Trench',       bool: true },
  { key: 'stuckBump',         label: 'Bump',         bool: true },
  { key: 'damaged',           label: 'Dmg',          bool: true },
  { key: 'died',              label: 'Died',         bool: true },
  { key: 'tipped',            label: 'Tipped',       bool: true },
  { key: 'accuracyRating',    label: 'Acc.' },
  { key: 'skillRating',       label: 'Skill' },
  { key: 'defenseRating',     label: 'Def.' },
]

// ── Stat helpers ──────────────────────────────────────────────────────────────

function pctile(sorted: number[], p: number) {
  if (sorted.length === 1) return sorted[0]
  const idx = (p / 100) * (sorted.length - 1)
  const lo  = Math.floor(idx)
  const hi  = Math.min(Math.ceil(idx), sorted.length - 1)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

function thresholds(vals: number[]) {
  const s = [...vals].sort((a, b) => a - b)
  return { q1: pctile(s, 25), q3: pctile(s, 75) }
}

type Ind = 'high' | 'avg' | 'low'
function indicator(v: number, q1: number, q3: number, higherIsWorse = false): Ind {
  if (v >= q3) return higherIsWorse ? 'low' : 'high'
  if (v <= q1) return higherIsWorse ? 'high' : 'low'
  return 'avg'
}

const IND_CLS: Record<Ind, string> = {
  high: 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/30',
  avg:  'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30',
  low:  'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/30',
}

// ── Box-and-whisker plot ──────────────────────────────────────────────────────

const LW = 64   // label column width (SVG units)
const RH = 28   // row height
const PR = 8    // right padding

type BoxRow = { teamNumber: number; stat: StatBlock }

type Tooltip = { x: number; y: number; team: number; stat: StatBlock }
type TouchTip = { team: number; stat: StatBlock }

function SrzBoxPlot({ rows, onTeamClick }: { rows: BoxRow[]; onTeamClick: (n: number) => void }) {
  const [tip, setTip]     = useState<Tooltip | null>(null)
  const [touch, setTouch] = useState<TouchTip | null>(null)
  const closeTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allMin = Math.min(...rows.map(r => r.stat.min))
  const allMax = Math.max(...rows.map(r => r.stat.max))
  const range  = allMax - allMin || 1
  const svgW   = 600
  const plotW  = svgW - LW - PR
  const svgH   = rows.length * RH + 20

  const toX = (v: number) => LW + ((v - allMin) / range) * plotW

  function openTouch(team: number, stat: StatBlock) {
    setTouch({ team, stat })
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setTouch(null), 10000)
  }

  return (
    <div className="relative overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="select-none">
        {/* X-axis ticks */}
        {[0, 25, 50, 75, 100].map(pct => {
          const v  = allMin + (pct / 100) * range
          const x  = toX(v)
          const lbl = Number.isInteger(v) ? v : v.toFixed(1)
          return (
            <g key={pct}>
              <line x1={x} y1={8} x2={x} y2={svgH - 4} stroke="currentColor" strokeOpacity={0.08} />
              <text x={x} y={svgH} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.4}>{lbl}</text>
            </g>
          )
        })}

        {rows.map((row, i) => {
          const cy  = i * RH + RH / 2 + 10
          const { min, q1, median, q3, max, avg } = row.stat
          return (
            <g key={row.teamNumber}>
              <text
                x={LW - 6} y={cy + 4}
                textAnchor="end" fontSize={11}
                className="cursor-pointer fill-blue-600 dark:fill-blue-400 hover:underline"
                onClick={() => onTeamClick(row.teamNumber)}
              >
                {row.teamNumber}
              </text>
              {/* Whisker */}
              <line x1={toX(min)} y1={cy} x2={toX(max)} y2={cy} stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} />
              <line x1={toX(min)} y1={cy - 5} x2={toX(min)} y2={cy + 5} stroke="currentColor" strokeOpacity={0.5} strokeWidth={1} />
              <line x1={toX(max)} y1={cy - 5} x2={toX(max)} y2={cy + 5} stroke="currentColor" strokeOpacity={0.5} strokeWidth={1} />
              {/* Box */}
              <rect
                x={toX(q1)} y={cy - 7}
                width={Math.max(1, toX(q3) - toX(q1))} height={14}
                fill="#6366f1" fillOpacity={0.25} stroke="#6366f1" strokeOpacity={0.6} strokeWidth={1}
              />
              {/* Median */}
              <line x1={toX(median)} y1={cy - 7} x2={toX(median)} y2={cy + 7} stroke="#6366f1" strokeWidth={2} />
              {/* Avg dot */}
              <circle cx={toX(avg)} cy={cy} r={3} fill="#f59e0b" />
              {/* Hover area */}
              <rect
                x={0} y={i * RH + 10} width={svgW} height={RH}
                fill="transparent"
                onMouseMove={e => setTip({ x: e.clientX, y: e.clientY, team: row.teamNumber, stat: row.stat })}
                onMouseLeave={() => setTip(null)}
                onTouchStart={() => openTouch(row.teamNumber, row.stat)}
              />
            </g>
          )
        })}
      </svg>

      {/* Hover tooltip */}
      {tip && (
        <div
          className="pointer-events-none fixed z-50 max-w-48 rounded-lg border border-zinc-200 bg-white p-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          style={{ left: tip.x + 14, top: tip.y - 10 }}
        >
          <p className="mb-1 font-semibold text-zinc-800 dark:text-zinc-100">Team {tip.team}</p>
          <p className="text-zinc-500 dark:text-zinc-400">
            Min <b>{tip.stat.min}</b> · Q1 <b>{tip.stat.q1}</b><br />
            Med <b>{tip.stat.median}</b> · Q3 <b>{tip.stat.q3}</b><br />
            Max <b>{tip.stat.max}</b> · Avg <b className="text-amber-600 dark:text-amber-400">{tip.stat.avg}</b>
          </p>
        </div>
      )}

      {/* Touch popup */}
      {touch && (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <p className="font-semibold text-zinc-800 dark:text-zinc-100">Team {touch.team}</p>
            <button onClick={() => setTouch(null)} className="ml-2 text-zinc-400 hover:text-zinc-600">✕</button>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            {(['min','q1','median','q3','max','avg'] as (keyof StatBlock)[]).map(k => (
              <span key={k}><span className="capitalize">{k}</span>: <b className={k==='avg' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-700 dark:text-zinc-200'}>{touch.stat[k]}</b></span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Boolean bar chart ─────────────────────────────────────────────────────────

function BoolBarChart({ rows, higherIsWorse, onTeamClick }: {
  rows: { teamNumber: number; pct: number }[]
  higherIsWorse?: boolean
  onTeamClick: (n: number) => void
}) {
  const svgW  = 600
  const plotW = svgW - LW - PR
  const svgH  = rows.length * RH + 20

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="select-none">
        {[0, 25, 50, 75, 100].map(p => {
          const x = LW + (p / 100) * plotW
          return (
            <g key={p}>
              <line x1={x} y1={8} x2={x} y2={svgH - 4} stroke="currentColor" strokeOpacity={0.08} />
              <text x={x} y={svgH} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.4}>{p}%</text>
            </g>
          )
        })}
        {rows.map((row, i) => {
          const cy  = i * RH + RH / 2 + 10
          const barW = (row.pct / 100) * plotW
          const fill = higherIsWorse
            ? (row.pct > 50 ? '#ef4444' : row.pct > 25 ? '#f59e0b' : '#22c55e')
            : (row.pct > 66 ? '#22c55e' : row.pct > 33 ? '#6366f1' : '#94a3b8')
          return (
            <g key={row.teamNumber}>
              <text
                x={LW - 6} y={cy + 4}
                textAnchor="end" fontSize={11}
                className="cursor-pointer fill-blue-600 dark:fill-blue-400 hover:underline"
                onClick={() => onTeamClick(row.teamNumber)}
              >
                {row.teamNumber}
              </text>
              <rect x={LW} y={cy - 8} width={plotW} height={16} fill="currentColor" fillOpacity={0.04} rx={2} />
              <rect x={LW} y={cy - 8} width={Math.max(0, barW)} height={16} fill={fill} fillOpacity={0.7} rx={2} />
              <text x={LW + barW + 4} y={cy + 4} fontSize={10} fill="currentColor" fillOpacity={0.6}>{row.pct}%</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Avg bar chart ─────────────────────────────────────────────────────────────

function AvgBarChart({ rows, onTeamClick }: { rows: BoxRow[]; onTeamClick: (n: number) => void }) {
  const maxAvg = Math.max(...rows.map(r => r.stat.avg), 0.001)
  const svgW   = 600
  const plotW  = svgW - LW - PR - 40
  const svgH   = rows.length * RH + 20

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="select-none">
        {rows.map((row, i) => {
          const cy  = i * RH + RH / 2 + 10
          const bW  = (row.stat.avg / maxAvg) * plotW
          return (
            <g key={row.teamNumber}>
              <text
                x={LW - 6} y={cy + 4}
                textAnchor="end" fontSize={11}
                className="cursor-pointer fill-blue-600 dark:fill-blue-400 hover:underline"
                onClick={() => onTeamClick(row.teamNumber)}
              >
                {row.teamNumber}
              </text>
              <rect x={LW} y={cy - 8} width={plotW} height={16} fill="currentColor" fillOpacity={0.04} rx={2} />
              <rect x={LW} y={cy - 8} width={Math.max(0, bW)} height={16} fill="#f59e0b" fillOpacity={0.75} rx={2} />
              <text x={LW + bW + 4} y={cy + 4} fontSize={10} fill="currentColor" fillOpacity={0.7}>{row.stat.avg}</text>
            </g>
          )
        })}
        <text x={svgW - PR} y={svgH} textAnchor="end" fontSize={9} fill="currentColor" fillOpacity={0.4}>{maxAvg}</text>
      </svg>
    </div>
  )
}

// ── Numeric table ─────────────────────────────────────────────────────────────

function NumTable({ summaries, onTeamClick }: { summaries: SrzSummary[]; onTeamClick: (n: number) => void }) {
  const th = 'whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'
  const td = 'px-3 py-2 text-xs tabular-nums text-zinc-700 dark:text-zinc-300'
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <th className={th}>Team</th>
            <th className={th}>Rec</th>
            {NUM_FIELDS.map(f => (
              <th key={f.key} className={th} colSpan={6}>{f.label}</th>
            ))}
          </tr>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <th className={th} colSpan={2} />
            {NUM_FIELDS.map(f => (
              ['Min','Q1','Med','Q3','Max','Avg'].map(h => (
                <th key={f.key + h} className={th}>{h}</th>
              ))
            ))}
          </tr>
        </thead>
        <tbody>
          {summaries.map(s => (
            <tr key={s.teamNumber} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40">
              <td className="px-3 py-2">
                <button onClick={() => onTeamClick(s.teamNumber)} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                  {s.teamNumber}
                </button>
              </td>
              <td className={td}>{s.records ?? '—'}</td>
              {NUM_FIELDS.map(f => {
                const st = s[f.key] as StatBlock | undefined
                return (['min','q1','median','q3','max','avg'] as (keyof StatBlock)[]).map(k => (
                  <td key={f.key + k} className={td}>{st?.[k] ?? '—'}</td>
                ))
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Boolean table ─────────────────────────────────────────────────────────────

function BoolTable({ summaries, onTeamClick }: { summaries: SrzSummary[]; onTeamClick: (n: number) => void }) {
  const th = 'whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'
  const td = 'px-3 py-2 text-xs tabular-nums text-zinc-700 dark:text-zinc-300'
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <th className={th}>Team</th>
            {BOOL_FIELDS.map(f => <th key={f.key} className={th}>{f.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {summaries.map(s => (
            <tr key={s.teamNumber} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40">
              <td className="px-3 py-2">
                <button onClick={() => onTeamClick(s.teamNumber)} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                  {s.teamNumber}
                </button>
              </td>
              {BOOL_FIELDS.map(f => <td key={f.key} className={td}>{s[f.key] != null ? `${s[f.key]}%` : '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Team popup ────────────────────────────────────────────────────────────────

function TeamPopup({ teamNumber, summary, allSummaries, eventCode, onClose }: {
  teamNumber: number
  summary: SrzSummary
  allSummaries: SrzSummary[]
  eventCode: string
  onClose: () => void
}) {
  const [records, setRecords] = useState<ProcessedRec[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/events/${eventCode}/srz-processed/${teamNumber}`)
      .then(r => r.json())
      .then((rows: ProcessedRec[]) => { if (Array.isArray(rows)) setRecords(rows) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [teamNumber, eventCode])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Precompute thresholds from all event teams
  const numTh = Object.fromEntries(
    NUM_FIELDS.map(f => {
      const vals = allSummaries.map(s => (s[f.key] as StatBlock)?.avg ?? 0)
      return [f.key, thresholds(vals)]
    })
  )
  const boolTh = Object.fromEntries(
    BOOL_FIELDS.map(f => {
      const vals = allSummaries.map(s => s[f.key] ?? 0)
      return [f.key, thresholds(vals)]
    })
  )

  const th = 'whitespace-nowrap px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'
  const td = 'px-2 py-1.5 text-[11px] tabular-nums text-zinc-700 dark:text-zinc-300'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Team {teamNumber}</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{summary.records ?? 0} match records · {eventCode}</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">✕</button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {/* Numeric metrics */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Numeric Stats (avg vs. event)</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {NUM_FIELDS.map(f => {
                const stat = summary[f.key] as StatBlock | undefined
                const avg  = stat?.avg ?? 0
                const { q1, q3 } = numTh[f.key]
                const ind  = indicator(avg, q1, q3)
                return (
                  <div key={f.key} className={`rounded-lg p-2 ${IND_CLS[ind]}`}>
                    <p className="text-[10px] font-medium opacity-70">{f.label}</p>
                    <p className="text-lg font-bold">{avg}</p>
                    <p className="text-[10px] opacity-60">Med {stat?.median ?? '—'} · Q1 {stat?.q1 ?? '—'} · Q3 {stat?.q3 ?? '—'}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Boolean metrics */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Boolean Rates (% true vs. event)</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {BOOL_FIELDS.map(f => {
                const pct = summary[f.key] ?? 0
                const { q1, q3 } = boolTh[f.key]
                const ind = indicator(pct, q1, q3, f.higherIsWorse)
                return (
                  <div key={f.key} className={`rounded-lg p-2 ${IND_CLS[ind]}`}>
                    <p className="text-[10px] font-medium opacity-70">{f.label}</p>
                    <p className="text-lg font-bold">{pct}%</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Start position */}
          {summary.startPosition && Object.keys(summary.startPosition).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Start Position</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.startPosition).map(([pos, pct]) => (
                  <span key={pos} className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {pos}: {pct}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Raw records table */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Raw Match Records{loading ? ' (loading…)' : ` (${records.length})`}
            </p>
            {!loading && records.length === 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">No processed records found.</p>
            )}
            {records.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                      <th className={th}>Match</th>
                      <th className={th}>Lvl</th>
                      {PROC_COLS.map(c => <th key={c.key as string} className={th}>{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec, i) => (
                      <tr key={i} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30">
                        <td className={td}>{rec.matchNumber}</td>
                        <td className={td}>{rec.tournamentLevel?.slice(0, 4)}</td>
                        {PROC_COLS.map(c => {
                          const v = rec[c.key]
                          if (c.bool) return <td key={c.key as string} className={td}>{v === 1 ? '✓' : v === 0 ? '—' : '?'}</td>
                          return <td key={c.key as string} className={td}>{v != null ? String(v) : '—'}</td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

type Category = 'numeric' | 'boolean' | 'startpos'
type NumView  = 'chart' | 'table' | 'avg'
type BoolView = 'chart' | 'table'

export default function SrzAnalysisTab({ eventCode }: { eventCode: string }) {
  const [summaries, setSummaries] = useState<SrzSummary[]>([])
  const [loading, setLoading]     = useState(true)
  const [category, setCategory]   = useState<Category>('numeric')
  const [numView, setNumView]     = useState<NumView>('chart')
  const [boolView, setBoolView]   = useState<BoolView>('chart')
  const [numField, setNumField]   = useState<NumKey>('autoScore')
  const [boolField, setBoolField] = useState<BoolKey>('autoScoredFuel')
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/events/${eventCode}/srz-summary`)
      .then(r => r.json())
      .then((data: SrzSummary[]) => { if (Array.isArray(data)) setSummaries(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [eventCode])

  const handleTeamClick = useCallback((n: number) => setSelectedTeam(n), [])

  if (loading) return <p className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">Loading SRz data…</p>
  if (summaries.length === 0) return (
    <p className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
      No SRz summary data for this event. Run "Process ScoutRadioz Summaries" in Data Processing first.
    </p>
  )

  // Derived sorted rows
  const numDef   = NUM_FIELDS.find(f => f.key === numField)!
  const boolDef  = BOOL_FIELDS.find(f => f.key === boolField)!

  const numSorted = [...summaries]
    .filter(s => s[numField] != null)
    .sort((a, b) => ((b[numField] as StatBlock)?.median ?? 0) - ((a[numField] as StatBlock)?.median ?? 0))

  const boolSorted = [...summaries]
    .sort((a, b) => (b[boolField] ?? 0) - (a[boolField] ?? 0))

  const boxRows  = numSorted.map(s => ({ teamNumber: s.teamNumber, stat: s[numField] as StatBlock }))
  const boolRows = boolSorted.map(s => ({ teamNumber: s.teamNumber, pct: s[boolField] ?? 0 }))

  const btnCls = (active: boolean) =>
    `rounded-md px-3 py-1 text-xs font-medium transition-colors ${active
      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50'
      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
    }`

  const tabCls = (active: boolean) =>
    `-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${active
      ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
      : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
    }`

  const selectedSummary = selectedTeam != null ? summaries.find(s => s.teamNumber === selectedTeam) : undefined

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <button className={tabCls(category === 'numeric')}  onClick={() => setCategory('numeric')}>Numeric Stats</button>
        <button className={tabCls(category === 'boolean')}  onClick={() => setCategory('boolean')}>Boolean Rates</button>
        <button className={tabCls(category === 'startpos')} onClick={() => setCategory('startpos')}>Start Position</button>
      </div>

      {/* ── Numeric section ─────────────────────────────────────────────────── */}
      {category === 'numeric' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View toggle */}
            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
              {(['chart','table','avg'] as NumView[]).map(v => (
                <button key={v} onClick={() => setNumView(v)} className={btnCls(numView === v)}>
                  {v === 'avg' ? 'Avg View' : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            {/* Field selector (chart + avg views) */}
            {numView !== 'table' && (
              <div className="inline-flex flex-wrap rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
                {NUM_FIELDS.map(f => (
                  <button key={f.key} onClick={() => setNumField(f.key)} className={btnCls(numField === f.key)}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {numView === 'chart' && (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">{numDef.label} — sorted by median</p>
              <SrzBoxPlot rows={boxRows} onTeamClick={handleTeamClick} />
            </div>
          )}
          {numView === 'avg' && (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">{numDef.label} — average comparison</p>
              <AvgBarChart rows={[...boxRows].sort((a,b) => b.stat.avg - a.stat.avg)} onTeamClick={handleTeamClick} />
            </div>
          )}
          {numView === 'table' && <NumTable summaries={summaries} onTeamClick={handleTeamClick} />}
        </div>
      )}

      {/* ── Boolean section ──────────────────────────────────────────────────── */}
      {category === 'boolean' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
              {(['chart','table'] as BoolView[]).map(v => (
                <button key={v} onClick={() => setBoolView(v)} className={btnCls(boolView === v)}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            {boolView === 'chart' && (
              <div className="inline-flex flex-wrap rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
                {BOOL_FIELDS.map(f => (
                  <button key={f.key} onClick={() => setBoolField(f.key)} className={btnCls(boolField === f.key)}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {boolView === 'chart' && (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {boolDef.label} — % of matches where true
                {boolDef.higherIsWorse && <span className="ml-2 text-xs text-red-500">(higher is worse)</span>}
              </p>
              <BoolBarChart rows={boolRows} higherIsWorse={boolDef.higherIsWorse} onTeamClick={handleTeamClick} />
            </div>
          )}
          {boolView === 'table' && <BoolTable summaries={summaries} onTeamClick={handleTeamClick} />}
        </div>
      )}

      {/* ── Start position section ───────────────────────────────────────────── */}
      {category === 'startpos' && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {(() => {
            const allPos = Array.from(new Set(summaries.flatMap(s => Object.keys(s.startPosition ?? {})))).sort()
            if (allPos.length === 0) return (
              <p className="py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">No start position data.</p>
            )
            const COLORS = ['#6366f1','#f59e0b','#22c55e','#ef4444','#8b5cf6','#06b6d4']
            const sorted = [...summaries].sort((a, b) => {
              const top = allPos[0]
              return (b.startPosition?.[top] ?? 0) - (a.startPosition?.[top] ?? 0)
            })
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Team</th>
                      {allPos.map((p, pi) => (
                        <th key={p} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS[pi % COLORS.length] }}>{p}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(s => (
                      <tr key={s.teamNumber} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40">
                        <td className="px-4 py-2">
                          <button onClick={() => handleTeamClick(s.teamNumber)} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                            {s.teamNumber}
                          </button>
                        </td>
                        {allPos.map((p, pi) => {
                          const pct = s.startPosition?.[p] ?? 0
                          return (
                            <td key={p} className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[pi % COLORS.length] }} />
                                </div>
                                <span className="tabular-nums text-zinc-600 dark:text-zinc-400">{pct}%</span>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      )}

      {/* Team popup */}
      {selectedTeam != null && selectedSummary && (
        <TeamPopup
          teamNumber={selectedTeam}
          summary={selectedSummary}
          allSummaries={summaries}
          eventCode={eventCode}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  )
}
