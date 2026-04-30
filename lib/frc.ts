const BASE = 'https://frc-api.firstinspires.org/v3.0'

const frcHeaders = {
  'Authorization': `Basic ${process.env.FRC_AUTH}`,
  'Content-Type': 'application/json',
}

async function frcFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: frcHeaders })
  if (!res.ok) {
    throw new Error(`FRC API ${res.status}: ${res.statusText} — ${path}`)
  }
  return res.json()
}

export async function fetchAllEvents(season = process.env.Season ?? '2026') {
  const data = await frcFetch(`/${season}/events`)
  return (data.Events ?? []) as Record<string, unknown>[]
}

export async function fetchEventMatches(eventCode: string, season = process.env.Season ?? '2026') {
  const levels = ['Qualification', 'Playoff']
  const all: Record<string, unknown>[] = []
  for (const level of levels) {
    try {
      const data = await frcFetch(`/${season}/matches/${eventCode}?tournamentLevel=${level}`)
      all.push(...((data.Matches ?? []) as Record<string, unknown>[]))
    } catch {
      // level not available yet — skip
    }
  }
  return all
}

export async function fetchEventRankings(eventCode: string, season = process.env.Season ?? '2026') {
  const data = await frcFetch(`/${season}/rankings/${eventCode}`)
  return (data.Rankings ?? []) as Record<string, unknown>[]
}

export async function fetchEventTeams(eventCode: string, season = process.env.Season ?? '2026') {
  const first = await frcFetch(`/${season}/teams?eventCode=${eventCode}&page=1`)
  const teams: Record<string, unknown>[] = [...(first.teams ?? [])]
  const pageTotal: number = first.pageTotal ?? 1

  for (let page = 2; page <= pageTotal; page++) {
    const data = await frcFetch(`/${season}/teams?eventCode=${eventCode}&page=${page}`)
    teams.push(...(data.teams ?? []))
  }

  return teams
}

export async function fetchEventSchedule(eventCode: string, season = process.env.Season ?? '2026') {
  const levels = ['Qualification', 'Playoff']
  const all: Record<string, unknown>[] = []
  for (const level of levels) {
    try {
      const data = await frcFetch(`/${season}/schedule/${eventCode}?tournamentLevel=${level}`)
      const entries = (data.Schedule ?? []) as Record<string, unknown>[]
      for (const e of entries) all.push({ ...e, tournamentLevel: level })
    } catch {
      // level not available yet — skip
    }
  }
  return all
}

export async function fetchAllTeams(season = process.env.Season ?? '2026') {
  const first = await frcFetch(`/${season}/teams?page=1`)
  const teams: Record<string, unknown>[] = [...(first.teams ?? [])]
  const pageTotal: number = first.pageTotal ?? 1

  for (let page = 2; page <= pageTotal; page++) {
    const data = await frcFetch(`/${season}/teams?page=${page}`)
    teams.push(...(data.teams ?? []))
  }

  return teams
}
