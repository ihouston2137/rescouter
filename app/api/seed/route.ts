import { hash } from 'bcrypt-ts'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'

const DEV_EMAIL = 'admin@rescouter.dev'
const DEV_PASSWORD = 'Admin1234!'
const DEV_NAME = 'Dev Admin'

export async function GET() {
  //if (process.env.NODE_ENV !== 'development') {
  //  return Response.json({ error: 'Not available outside development.' }, { status: 403 })
  //}

  await connectDB()

  const existing = await User.findOne({ email: DEV_EMAIL })
  if (existing) {
    return Response.json({ message: 'Dev account already exists.', email: DEV_EMAIL })
  }

  const hashed = await hash(DEV_PASSWORD, 10)
  await User.create({ email: DEV_EMAIL, password: hashed, name: DEV_NAME, role: 'admin' })

  return Response.json({
    message: 'Dev account created.',
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
  })
}
