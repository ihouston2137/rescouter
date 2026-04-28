import { Schema, models, model } from 'mongoose'

const EventSchema = new Schema({
  code: { type: String, required: true },
  season: { type: Number, required: true },
  name: String,
  type: String,
  typeName: String,
  districtCode: String,
  venue: String,
  address: String,
  city: String,
  stateProv: String,
  country: String,
  dateStart: Date,
  dateEnd: Date,
  webcasts: [{ type: String }],
}, { timestamps: true })

EventSchema.index({ code: 1, season: 1 }, { unique: true })

export default models.FrcEvent || model('FrcEvent', EventSchema)
