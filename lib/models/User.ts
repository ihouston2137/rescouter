import { Schema, Document, models, model } from 'mongoose'

export interface IUser extends Document {
  email: string
  password: string
  name: string
  role: string
  permissions: string[]
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'scout', 'viewer'], default: 'viewer' },
  permissions: [{ type: String }],
}, { timestamps: true })

export default models.User || model<IUser>('User', UserSchema)
