import connectDB from '@/lib/db'
import User from '@/lib/models/User'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import UsersClient from './UsersClient'

export default async function UsersPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  await connectDB()
  const raw = await User.find({}).sort({ createdAt: 1 }).lean()

  const users = raw.map(u => ({
    _id: (u._id as { toString(): string }).toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    permissions: (u.permissions as string[]) ?? [],
  }))

  return <UsersClient users={users} currentUserId={session.userId as string} />
}
