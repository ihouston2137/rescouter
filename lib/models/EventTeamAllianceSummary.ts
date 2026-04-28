import { Schema, models, model } from 'mongoose'

const EventTeamAllianceSummarySchema = new Schema({
  eventCode: { type: String, required: true },
  season: { type: Number, required: true },
  teamNumber: { type: Number, required: true },
  autoMin: Number,
  autoQ1: Number,
  autoMedian: Number,
  autoQ3: Number,
  autoMax: Number,
  finalMin: Number,
  finalQ1: Number,
  finalMedian: Number,
  finalQ3: Number,
  finalMax: Number,
}, { timestamps: true, collection: 'event-team-alliances-summary' })

EventTeamAllianceSummarySchema.index({ eventCode: 1, season: 1, teamNumber: 1 }, { unique: true })

export default models.EventTeamAllianceSummary ||
  model('EventTeamAllianceSummary', EventTeamAllianceSummarySchema, 'event-team-alliances-summary')
