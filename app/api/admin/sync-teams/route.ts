import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcTeam from '@/lib/models/Team'
import { fetchAllTeams } from '@/lib/frc'

export async function POST() {
  const session = await getSession()
  if (!session?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()
    const teams = await fetchAllTeams()
    const season = Number(process.env.Season ?? '2026')

    let count = 0
    for (const team of teams) {
      await FrcTeam.findOneAndUpdate(
        { teamNumber: team.teamNumber, season: team.season ?? season },
        {
          teamNumber: team.teamNumber,
          season: team.season ?? season,
          nameFull: team.nameFull,
          nameShort: team.nameShort,
          schoolName: team.schoolName,
          city: team.city,
          stateProv: team.stateProv,
          country: team.country,
          website: team.website,
          rookieYear: team.rookieYear,
        },
        { upsert: true, returnDocument: 'after' }
      )
      count++
    }

    return Response.json({ count })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
