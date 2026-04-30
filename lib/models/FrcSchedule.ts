import { Schema, models, model } from 'mongoose'

const FrcScheduleSchema = new Schema({
  eventCode:      { type: String, required: true },
  season:         { type: Number, required: true },
  tournamentLevel:{ type: String, required: true },
  matchNumber:    { type: Number, required: true },
  description:    String,
  startTime:      String,
  field:          String,
  teams: [{
    teamNumber: Number,
    station:    String,
    surrogate:  Boolean,
  }],
}, { timestamps: true, collection: 'frcschedules' })

FrcScheduleSchema.index(
  { eventCode: 1, season: 1, tournamentLevel: 1, matchNumber: 1 },
  { unique: true },
)

export default models.FrcSchedule ||
  model('FrcSchedule', FrcScheduleSchema, 'frcschedules')
