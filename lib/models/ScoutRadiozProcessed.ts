import { Schema, models, model } from 'mongoose'

const ScoutRadiozProcessedSchema = new Schema({
  org_key:         { type: String, required: true },
  season:          { type: Number, required: true },
  eventCode:       { type: String, required: true },
  teamNumber:      { type: Number, required: true },
  tournamentLevel: { type: String, required: true },
  matchNumber:     { type: Number, required: true },
  // Output fields (booleans stored as 0 | 1)
  startPosition:      String,
  autoScoredFuel:     Number,
  autoCycles:         Number,
  autoScore:          Number,
  autoClimb:          Number,
  teleScoredFuel:     Number,
  teleFuelCycles:     Number,
  teleScore:          Number,
  telePassCycles:     Number,
  endgameClimb:       Number,
  endgameClimbLevel:  String,
  passNeutral:        Number,
  passOpposite:       Number,
  beached:            Number,
  stuckTrench:        Number,
  stuckBump:          Number,
  damaged:            Number,
  died:               Number,
  tipped:             Number,
  accuracyRating:     Number,
  skillRating:        Number,
  defenseRating:      Number,
}, { timestamps: true, collection: 'scoutradioz-processed' })

ScoutRadiozProcessedSchema.index(
  { org_key: 1, season: 1, eventCode: 1, teamNumber: 1, tournamentLevel: 1, matchNumber: 1 },
  { unique: true },
)

export default models.ScoutRadiozProcessed ||
  model('ScoutRadiozProcessed', ScoutRadiozProcessedSchema, 'scoutradioz-processed')
