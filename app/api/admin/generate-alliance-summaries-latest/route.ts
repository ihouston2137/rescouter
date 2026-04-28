import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import EventTeamAllianceSummary from '@/lib/models/EventTeamAllianceSummary'
import EventTeamAllianceSummaryLatest from '@/lib/models/EventTeamAllianceSummaryLatest'

export async function POST() {
  const session = await getSession()
  if (!session?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()

    // Only fully completed events, oldest end date first so newer events
    // overwrite older ones and each team ends up with their most recent data.
    const completedEvents = await FrcEvent.find({ dateEnd: { $lte: new Date() } })
      .sort({ dateEnd: 1 })
      .select('code season')
      .lean() as { code: string; season: number }[]

    let count = 0

    for (const event of completedEvents) {
      const summaries = await EventTeamAllianceSummary.find({
        eventCode: event.code,
        season:    event.season,
      })
        .select('-_id -createdAt -updatedAt -__v')
        .lean() as any[]

      for (const s of summaries) {
        await EventTeamAllianceSummaryLatest.findOneAndUpdate(
          { season: event.season, teamNumber: s.teamNumber },
          {
            season:     event.season,
            teamNumber: s.teamNumber,
            eventCode:  event.code,
            autoMin:    s.autoMin,
            autoQ1:     s.autoQ1,
            autoMedian: s.autoMedian,
            autoQ3:     s.autoQ3,
            autoMax:    s.autoMax,
            finalMin:    s.finalMin,
            finalQ1:     s.finalQ1,
            finalMedian: s.finalMedian,
            finalQ3:     s.finalQ3,
            finalMax:    s.finalMax,
            adjustedAutoMin:    s.adjustedAutoMin,
            adjustedAutoQ1:     s.adjustedAutoQ1,
            adjustedAutoMedian: s.adjustedAutoMedian,
            adjustedAutoQ3:     s.adjustedAutoQ3,
            adjustedAutoMax:    s.adjustedAutoMax,
            adjustedFinalMin:    s.adjustedFinalMin,
            adjustedFinalQ1:     s.adjustedFinalQ1,
            adjustedFinalMedian: s.adjustedFinalMedian,
            adjustedFinalQ3:     s.adjustedFinalQ3,
            adjustedFinalMax:    s.adjustedFinalMax,
          },
          { upsert: true },
        )
        count++
      }
    }

    return Response.json({
      count,
      message: `Done — ${count} latest summaries upserted across ${completedEvents.length} events.`,
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
