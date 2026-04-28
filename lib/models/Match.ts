import { Schema, models, model } from 'mongoose'

const TeamStationSchema = new Schema({
  teamNumber: Number,
  station: String,
  dq: Boolean,
}, { _id: false })

const MatchSchema = new Schema({
  season: { type: Number, required: true },
  eventCode: { type: String, required: true },
  matchNumber: { type: Number, required: true },
  tournamentLevel: { type: String, required: true },
  description: String,
  isReplay: Boolean,
  matchVideoLink: String,
  scoreRedFinal: Number,
  scoreRedFoul: Number,
  scoreRedAuto: Number,
  scoreBlueFinal: Number,
  scoreBlueFoul: Number,
  scoreBlueAuto: Number,
  autoStartTime: Date,
  actualStartTime: Date,
  postResultTime: Date,
  teams: [TeamStationSchema],
}, { timestamps: true })

MatchSchema.index({ eventCode: 1, season: 1, tournamentLevel: 1, matchNumber: 1 }, { unique: true })

export default models.FrcMatch || model('FrcMatch', MatchSchema)
