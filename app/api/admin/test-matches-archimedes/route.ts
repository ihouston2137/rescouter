import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const season = process.env.Season ?? '2026'
  const url = `https://frc-api.firstinspires.org/v3.0/${season}/matches/ARCHIMEDES?tournamentLevel=Qualification`

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${process.env.FRC_AUTH}`,
      'Content-Type': 'application/json',
    },
  })

  const body = await res.json()
  return Response.json({ url, httpStatus: res.status, body })
}
