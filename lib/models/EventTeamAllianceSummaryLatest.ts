import { Schema, models, model } from 'mongoose'

const EventTeamAllianceSummaryLatestSchema = new Schema({
  season:     { type: Number, required: true },
  teamNumber: { type: Number, required: true },
  eventCode:  { type: String, required: true },

  autoMin:    Number,
  autoQ1:     Number,
  autoMedian: Number,
  autoQ3:     Number,
  autoMax:    Number,

  finalMin:    Number,
  finalQ1:     Number,
  finalMedian: Number,
  finalQ3:     Number,
  finalMax:    Number,

  adjustedAutoMin:    Number,
  adjustedAutoQ1:     Number,
  adjustedAutoMedian: Number,
  adjustedAutoQ3:     Number,
  adjustedAutoMax:    Number,

  adjustedFinalMin:    Number,
  adjustedFinalQ1:     Number,
  adjustedFinalMedian: Number,
  adjustedFinalQ3:     Number,
  adjustedFinalMax:    Number,
}, { timestamps: true, collection: 'event-team-alliance-summary-latest' })

EventTeamAllianceSummaryLatestSchema.index({ season: 1, teamNumber: 1 }, { unique: true })

export default models.EventTeamAllianceSummaryLatest ||
  model('EventTeamAllianceSummaryLatest', EventTeamAllianceSummaryLatestSchema, 'event-team-alliance-summary-latest')
