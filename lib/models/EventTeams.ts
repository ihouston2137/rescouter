import { Schema, models, model } from 'mongoose'

const EventTeamsSchema = new Schema({
  eventCode: { type: String, required: true },
  season:    { type: Number, required: true },
  teamNumber: { type: Number, required: true },
}, { timestamps: true })

EventTeamsSchema.index({ eventCode: 1, season: 1, teamNumber: 1 }, { unique: true })

export default models.EventTeams || model('EventTeams', EventTeamsSchema)
