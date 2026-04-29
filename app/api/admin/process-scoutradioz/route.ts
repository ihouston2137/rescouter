import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import ScoutRadioz from '@/lib/models/ScoutRadioz'
import ScoutRadiozSummary from '@/lib/models/ScoutRadiozSummary'

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(val: unknown): number {
  const n = parseFloat(String(val ?? ''))
  return isNaN(n) ? 0 : n
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

type DataMap = Record<string, unknown>

function calcScores(records: { data: DataMap }[]) {
  const n = records.length

  const avg = (field: string) =>
    round2(records.reduce((s, r) => s + num(r.data[field]), 0) / n)

  const pct = (test: (d: DataMap) => boolean) =>
    round2((records.filter(r => test(r.data)).length / n) * 100)

  return {
    records:           n,
    contributionScore: avg('contributionPoints'),
    reliabilityScore:  avg('systemReliability'),
    foulScore:         avg('foulReliability'),
    climbScore:        avg('climbPoints'),
    defenseScore:      pct(d => num(d['inactiveDidDefense']) > 0),
    freezeScore:       pct(d => num(d['didRobotFreeze']) > 0),
    recoverScore:      pct(d => num(d['didRobotFreeze']) > 0 && num(d['didRobotRecover']) > 0),
    jamScore:          pct(d => num(d['didRobotJam']) > 0),
    stuckScore:        pct(d => num(d['didRobotStuck']) > 0),
    tipScore:          pct(d => num(d['didRobotTip']) > 0),
    topRobotScore:     pct(d => String(d['RankingRobot']).trim() === '1st'),
  }
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
      const records   = await ScoutRadioz.find({ eventCode }).lean() as { teamNumber: number; data: DataMap }[]

      if (records.length === 0) continue

      // Group records by teamNumber
      const byTeam = new Map<number, typeof records>()
      for (const rec of records) {
        const arr = byTeam.get(rec.teamNumber) ?? []
        arr.push(rec)
        byTeam.set(rec.teamNumber, arr)
      }

      const ops = []
      for (const [teamNumber, recs] of byTeam) {
        const scores = calcScores(recs)
        ops.push({
          updateOne: {
            filter: { eventCode, teamNumber },
            update: { $set: { eventCode, teamNumber, ...scores } },
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
