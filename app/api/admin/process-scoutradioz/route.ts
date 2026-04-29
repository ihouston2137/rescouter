import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import ScoutRadiozProcessed from '@/lib/models/ScoutRadiozProcessed'
import ScoutRadiozSummary from '@/lib/models/ScoutRadiozSummary'

// ── Stat helpers ──────────────────────────────────────────────────────────────

function round2(n: number) { return Math.round(n * 100) / 100 }

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0]
  const idx  = (p / 100) * (sorted.length - 1)
  const lo   = Math.floor(idx)
  const hi   = Math.min(Math.ceil(idx), sorted.length - 1)
  return round2(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo))
}

function numStats(values: number[]) {
  if (values.length === 0) return { min: 0, q1: 0, median: 0, q3: 0, max: 0, avg: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const n      = sorted.length
  return {
    min:    sorted[0],
    q1:     percentile(sorted, 25),
    median: percentile(sorted, 50),
    q3:     percentile(sorted, 75),
    max:    sorted[n - 1],
    avg:    round2(sorted.reduce((s, v) => s + v, 0) / n),
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ProcessedRec = {
  teamNumber:     number
  startPosition?: string
  autoScoredFuel?: number; autoClimb?: number; teleScoredFuel?: number
  endgameClimb?:  number;  passNeutral?: number; passOpposite?: number
  beached?:       number;  stuckTrench?: number; stuckBump?: number
  damaged?:       number;  died?: number; tipped?: number
  autoCycles?:    number;  autoScore?: number
  teleFuelCycles?: number; teleScore?: number; telePassCycles?: number
  accuracyRating?: number; skillRating?: number; defenseRating?: number
}

const BOOL_FIELDS = [
  'autoScoredFuel', 'autoClimb', 'teleScoredFuel', 'endgameClimb',
  'passNeutral', 'passOpposite', 'beached', 'stuckTrench', 'stuckBump',
  'damaged', 'died', 'tipped',
] as const

const NUM_FIELDS = [
  'autoCycles', 'autoScore', 'teleFuelCycles', 'teleScore', 'telePassCycles',
  'accuracyRating', 'skillRating', 'defenseRating',
] as const

// ── Calculation ───────────────────────────────────────────────────────────────

function calcSummary(recs: ProcessedRec[]) {
  const n = recs.length

  // startPosition: percentage per unique value
  const posCounts: Record<string, number> = {}
  for (const r of recs) {
    const val = r.startPosition?.trim()
    if (val) posCounts[val] = (posCounts[val] ?? 0) + 1
  }
  const startPosition: Record<string, number> = {}
  for (const [k, v] of Object.entries(posCounts)) {
    startPosition[k] = round2((v / n) * 100)
  }

  // Boolean fields: % of records where value === 1
  const boolResults: Record<string, number> = {}
  for (const f of BOOL_FIELDS) {
    const trueCount = recs.filter(r => r[f] === 1).length
    boolResults[f]  = round2((trueCount / n) * 100)
  }

  // Numeric fields: five-number summary + average
  const numResults: Record<string, ReturnType<typeof numStats>> = {}
  for (const f of NUM_FIELDS) {
    numResults[f] = numStats(recs.map(r => r[f] ?? 0))
  }

  return { records: n, startPosition, ...boolResults, ...numResults }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST() {
  const session = await getSession()
  if (!session?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()

    const now    = new Date()
    const events = await FrcEvent.find({ dateStart: { $lt: now } }).select('code').lean()

    let eventsProcessed = 0
    let teamsProcessed  = 0

    for (const event of events) {
      const eventCode = event.code.toUpperCase()
      const records   = await ScoutRadiozProcessed.find({ eventCode }).lean() as ProcessedRec[]

      if (records.length === 0) continue

      // Group by teamNumber
      const byTeam = new Map<number, ProcessedRec[]>()
      for (const rec of records) {
        const arr = byTeam.get(rec.teamNumber) ?? []
        arr.push(rec)
        byTeam.set(rec.teamNumber, arr)
      }

      const ops = []
      for (const [teamNumber, recs] of byTeam) {
        const summary = calcSummary(recs)
        ops.push({
          updateOne: {
            filter: { eventCode, teamNumber },
            update: { $set: { eventCode, teamNumber, ...summary } },
            upsert: true,
          },
        })
      }

      await ScoutRadiozSummary.bulkWrite(ops, { ordered: false })

      eventsProcessed++
      teamsProcessed += byTeam.size
    }

    return Response.json({
      eventsProcessed,
      teamsProcessed,
      message: `Done — ${teamsProcessed} team summaries across ${eventsProcessed} events.`,
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
