import mongoose from 'mongoose'
import { hash } from 'bcrypt-ts'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rescouter'

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'admin' },
}, { timestamps: true })

const DEV_EMAIL = 'admin@rescouter.dev'
const DEV_PASSWORD = 'Admin1234!'

try {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB:', mongoose.connection.host)

  const User = mongoose.models.User || mongoose.model('User', UserSchema)

  const existing = await User.findOne({ email: DEV_EMAIL })
  if (existing) {
    console.log('Dev account already exists — email:', DEV_EMAIL)
  } else {
    const hashed = await hash(DEV_PASSWORD, 10)
    await User.create({ email: DEV_EMAIL, password: hashed, name: 'Dev Admin', role: 'admin' })
    console.log('Dev account created successfully.')
    console.log('  Email:   ', DEV_EMAIL)
    console.log('  Password:', DEV_PASSWORD)
  }
} finally {
  await mongoose.disconnect()
}
