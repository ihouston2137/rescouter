import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import { fetchAllEvents } from '@/lib/frc'

export async function POST() {
  const session = await getSession()
  if (!session?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()
    const events = await fetchAllEvents()
    const season = Number(process.env.Season ?? '2026')

    let count = 0
    for (const evt of events) {
      await FrcEvent.findOneAndUpdate(
        { code: evt.code, season: evt.season ?? season },
        {
          code: evt.code,
          season: evt.season ?? season,
          name: evt.name,
          type: evt.type,
          typeName: evt.typeName,
          districtCode: evt.districtCode,
          venue: evt.venue,
          address: evt.address,
          city: evt.city,
          stateProv: evt.stateProv,
          country: evt.country,
          dateStart: evt.dateStart ? new Date(evt.dateStart as string) : undefined,
          dateEnd: evt.dateEnd ? new Date(evt.dateEnd as string) : undefined,
          webcasts: evt.webcasts ?? [],
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
