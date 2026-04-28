import Match from '@/lib/models/Match'

// ── Linear algebra ────────────────────────────────────────────────────────────

function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length
  const aug = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row
    }
    ;[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]
    if (Math.abs(aug[col][col]) < 1e-10) return null

    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = aug[row][col] / aug[col][col]
      for (let j = col; j <= n; j++) aug[row][j] -= factor * aug[col][j]
    }
  }

  return aug.map((row, i) => row[n] / row[i])
}

function leastSquares(A: number[][], b: number[]): number[] | null {
  const m = A.length
  const n = A[0].length

  const AtA: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < m; k++)
        AtA[i][j] += A[k][i] * A[k][j]

  const Atb: number[] = new Array(n).fill(0)
  for (let i = 0; i < n; i++)
    for (let k = 0; k < m; k++)
      Atb[i] += A[k][i] * b[k]

  return solveLinearSystem(AtA, Atb)
}

function round2(v: number) {
  return Math.round(v * 100) / 100
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type TeamMatchEntry = {
  matchNumber: number
  tournamentLevel: string
  description: string | null
  allianceAutoScore: number
  allianceFinalScore: number
  adjustedAutoScore: number | null
  adjustedFinalScore: number | null
}

export type TeamContribution = {
  teamNumber: number
  autoContribution: number | null
  finalContribution: number | null
  matchesPlayed: number
  matches: TeamMatchEntry[]
}

export type AllianceOPRResult = {
  valid: boolean
  matchesAnalyzed: number
  teamsAnalyzed: number
  teams: TeamContribution[]
}

// ── Core computation ──────────────────────────────────────────────────────────

export async function computeAllianceContributions(
  eventCode: string,
  season: number,
): Promise<AllianceOPRResult> {
  const matchDocs = await Match.find({
    eventCode,
    season,
    scoreRedFinal:  { $type: 'number' },
    scoreBlueFinal: { $type: 'number' },
    scoreRedAuto:   { $type: 'number' },
    scoreBlueAuto:  { $type: 'number' },
  })
    .select('matchNumber tournamentLevel description teams scoreRedAuto scoreRedFinal scoreBlueAuto scoreBlueFinal')
    .lean() as any[]

  if (matchDocs.length === 0) {
    return { valid: false, matchesAnalyzed: 0, teamsAnalyzed: 0, teams: [] }
  }

  // Index all teams appearing in scored matches
  const teamSet = new Set<number>()
  for (const m of matchDocs)
    for (const t of m.teams as { teamNumber: number; station: string }[])
      teamSet.add(t.teamNumber)

  const teamList = [...teamSet].sort((a, b) => a - b)
  const teamIndex = new Map(teamList.map((t, i) => [t, i]))
  const n = teamList.length

  // Build observation matrix (one row per alliance per match)
  const A: number[][] = []
  const bAuto: number[] = []
  const bFinal: number[] = []

  for (const m of matchDocs) {
    const teams = m.teams as { teamNumber: number; station: string }[]
    const redNums  = teams.filter(t => t.station.startsWith('Red')).map(t => t.teamNumber)
    const blueNums = teams.filter(t => t.station.startsWith('Blue')).map(t => t.teamNumber)

    const redRow = new Array(n).fill(0)
    for (const t of redNums) { const idx = teamIndex.get(t); if (idx !== undefined) redRow[idx] = 1 }
    A.push(redRow); bAuto.push(m.scoreRedAuto); bFinal.push(m.scoreRedFinal)

    const blueRow = new Array(n).fill(0)
    for (const t of blueNums) { const idx = teamIndex.get(t); if (idx !== undefined) blueRow[idx] = 1 }
    A.push(blueRow); bAuto.push(m.scoreBlueAuto); bFinal.push(m.scoreBlueFinal)
  }

  const autoOPR  = leastSquares(A, bAuto)
  const finalOPR = leastSquares(A, bFinal)

  function weightedScore(
    opr: number[],
    teamNumber: number,
    allianceTeams: number[],
    allianceScore: number,
  ): number {
    const effective = allianceTeams.map(t => {
      const idx = teamIndex.get(t)
      return Math.max(0, idx !== undefined ? (opr[idx] ?? 0) : 0)
    })
    const total = effective.reduce((s, v) => s + v, 0)
    const myIdx = teamIndex.get(teamNumber)
    const myEffective = myIdx !== undefined ? Math.max(0, opr[myIdx] ?? 0) : 0
    const weight = total > 0 ? myEffective / total : 1 / allianceTeams.length
    return round2(allianceScore * weight)
  }

  // Build per-team match lists (keep allianceTeams internally for adjusted calc)
  const levelOrder: Record<string, number> = { Qualification: 1, Playoff: 2, Final: 3 }

  type InternalMatch = {
    matchNumber: number
    tournamentLevel: string
    description: string | null
    allianceTeams: number[]
    allianceAutoScore: number
    allianceFinalScore: number
  }

  const teamMatches = new Map<number, InternalMatch[]>(teamList.map(t => [t, []]))

  for (const m of matchDocs) {
    const teams = m.teams as { teamNumber: number; station: string }[]
    const redNums  = teams.filter(t => t.station.startsWith('Red')).map(t => t.teamNumber)
    const blueNums = teams.filter(t => t.station.startsWith('Blue')).map(t => t.teamNumber)
    const base = {
      matchNumber:     m.matchNumber     as number,
      tournamentLevel: m.tournamentLevel as string,
      description:     (m.description   as string | undefined) ?? null,
    }
    for (const t of redNums)
      teamMatches.get(t)?.push({ ...base, allianceTeams: redNums,  allianceAutoScore: m.scoreRedAuto,  allianceFinalScore: m.scoreRedFinal  })
    for (const t of blueNums)
      teamMatches.get(t)?.push({ ...base, allianceTeams: blueNums, allianceAutoScore: m.scoreBlueAuto, allianceFinalScore: m.scoreBlueFinal })
  }

  const teams: TeamContribution[] = teamList.map((teamNumber, i) => ({
    teamNumber,
    autoContribution:  autoOPR  ? round2(autoOPR[i]  ?? 0) : null,
    finalContribution: finalOPR ? round2(finalOPR[i] ?? 0) : null,
    matchesPlayed: teamMatches.get(teamNumber)!.length,
    matches: teamMatches.get(teamNumber)!
      .sort((a, b) => {
        const d = (levelOrder[a.tournamentLevel] ?? 0) - (levelOrder[b.tournamentLevel] ?? 0)
        return d !== 0 ? d : a.matchNumber - b.matchNumber
      })
      .map(({ allianceTeams, ...m }) => ({
        ...m,
        adjustedAutoScore:  autoOPR  ? weightedScore(autoOPR,  teamNumber, allianceTeams, m.allianceAutoScore)  : null,
        adjustedFinalScore: finalOPR ? weightedScore(finalOPR, teamNumber, allianceTeams, m.allianceFinalScore) : null,
      })),
  }))

  teams.sort((a, b) => (b.finalContribution ?? 0) - (a.finalContribution ?? 0))

  return {
    valid: autoOPR !== null && finalOPR !== null,
    matchesAnalyzed: matchDocs.length,
    teamsAnalyzed: n,
    teams,
  }
}
