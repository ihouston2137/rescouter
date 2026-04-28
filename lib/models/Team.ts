import { Schema, models, model } from 'mongoose'

const TeamSchema = new Schema({
  teamNumber: { type: Number, required: true },
  season: { type: Number, required: true },
  nameFull: String,
  nameShort: String,
  schoolName: String,
  city: String,
  stateProv: String,
  country: String,
  website: String,
  rookieYear: Number,
}, { timestamps: true })

TeamSchema.index({ teamNumber: 1, season: 1 }, { unique: true })

export default models.FrcTeam || model('FrcTeam', TeamSchema)
