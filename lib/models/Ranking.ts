import { Schema, models, model } from 'mongoose'

const RankingSchema = new Schema({
  season: { type: Number, required: true },
  eventCode: { type: String, required: true },
  teamNumber: { type: Number, required: true },
  rank: Number,
  wins: Number,
  losses: Number,
  ties: Number,
  matchesPlayed: Number,
  dq: Number,
  qualAverage: Number,
  sortOrder1: Number,
  sortOrder2: Number,
  sortOrder3: Number,
  sortOrder4: Number,
  sortOrder5: Number,
  sortOrder6: Number,
}, { timestamps: true })

RankingSchema.index({ eventCode: 1, season: 1, teamNumber: 1 }, { unique: true })

export default models.FrcRanking || model('FrcRanking', RankingSchema)
