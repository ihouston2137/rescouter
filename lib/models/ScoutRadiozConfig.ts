import { Schema, models, model } from 'mongoose'

const ScoutRadiozConfigSchema = new Schema({
  name:      { type: String, default: '' },
  season:    { type: Number, required: true },
  eventCode: { type: String, default: '' },
  org_key:   { type: String, default: '' },
  mappings:  [Schema.Types.Mixed],
}, { timestamps: true, collection: 'scoutradioz-config' })

export default models.ScoutRadiozConfig ||
  model('ScoutRadiozConfig', ScoutRadiozConfigSchema, 'scoutradioz-config')
