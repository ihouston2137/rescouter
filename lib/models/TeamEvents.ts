import { Schema, models, model } from 'mongoose'

const TeamEventsSchema = new Schema({
  teamNumber: { type: Number, required: true },
  season:     { type: Number, required: true },
  eventCode:  { type: String, required: true },
}, { timestamps: true })

TeamEventsSchema.index({ teamNumber: 1, season: 1, eventCode: 1 }, { unique: true })

export default models.TeamEvents || model('TeamEvents', TeamEventsSchema)
