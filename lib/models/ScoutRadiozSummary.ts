import { Schema, models, model } from 'mongoose'

const ScoutRadiozSummarySchema = new Schema({
  eventCode:         { type: String, required: true },
  teamNumber:        { type: Number, required: true },
  records:           { type: Number },
  contributionScore: { type: Number },
  reliabilityScore:  { type: Number },
  foulScore:         { type: Number },
  climbScore:        { type: Number },
  defenseScore:      { type: Number },
  freezeScore:       { type: Number },
  recoverScore:      { type: Number },
  jamScore:          { type: Number },
  stuckScore:        { type: Number },
  tipScore:          { type: Number },
  topRobotScore:     { type: Number },
}, { timestamps: true, collection: 'scoutradioz-summary' })

ScoutRadiozSummarySchema.index(
  { eventCode: 1, teamNumber: 1 },
  { unique: true },
)

export default models.ScoutRadiozSummary ||
  model('ScoutRadiozSummary', ScoutRadiozSummarySchema, 'scoutradioz-summary')
