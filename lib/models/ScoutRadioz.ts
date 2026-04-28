import { Schema, models, model } from 'mongoose'

const ScoutRadiozSchema = new Schema({
  org_key:         { type: String, required: true },
  season:          { type: Number, required: true },
  eventCode:       { type: String, required: true },
  teamNumber:      { type: Number, required: true },
  tournamentLevel: { type: String, required: true },
  matchNumber:     { type: Number, required: true },
  data:            { type: Schema.Types.Mixed },
}, { timestamps: true, collection: 'scoutradioz' })

ScoutRadiozSchema.index(
  { org_key: 1, season: 1, eventCode: 1, teamNumber: 1, tournamentLevel: 1, matchNumber: 1 },
  { unique: true },
)

export default models.ScoutRadioz ||
  model('ScoutRadioz', ScoutRadiozSchema, 'scoutradioz')
