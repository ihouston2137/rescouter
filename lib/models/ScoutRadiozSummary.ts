import { Schema, models, model } from 'mongoose'

const ScoutRadiozSummarySchema = new Schema({
  eventCode:  { type: String, required: true },
  teamNumber: { type: Number, required: true },
  records:    Number,

  // startPosition: { [positionValue]: percentageOfRecords }
  startPosition: { type: Schema.Types.Mixed },

  // Boolean output fields — percentage of records where value is 1 (true)
  autoScoredFuel: Number,
  autoClimb:      Number,
  teleScoredFuel: Number,
  endgameClimb:   Number,
  passNeutral:    Number,
  passOpposite:   Number,
  beached:        Number,
  stuckTrench:    Number,
  stuckBump:      Number,
  damaged:        Number,
  died:           Number,
  tipped:         Number,

  // Numeric output fields — { min, q1, median, q3, max, avg }
  autoCycles:     { type: Schema.Types.Mixed },
  autoScore:      { type: Schema.Types.Mixed },
  teleFuelCycles: { type: Schema.Types.Mixed },
  teleScore:      { type: Schema.Types.Mixed },
  telePassCycles: { type: Schema.Types.Mixed },
  accuracyRating: { type: Schema.Types.Mixed },
  skillRating:    { type: Schema.Types.Mixed },
  defenseRating:  { type: Schema.Types.Mixed },
}, { timestamps: true, collection: 'scoutradioz-summary' })

ScoutRadiozSummarySchema.index(
  { eventCode: 1, teamNumber: 1 },
  { unique: true },
)

export default models.ScoutRadiozSummary ||
  model('ScoutRadiozSummary', ScoutRadiozSummarySchema, 'scoutradioz-summary')
