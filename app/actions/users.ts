'use server'

import { revalidatePath } from 'next/cache'
import { hash } from 'bcrypt-ts'
import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'

async function requireAuth() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Unauthorized')
}

export async function createUser(_: unknown, formData: FormData) {
  try {
    await requireAuth()

    const name = (formData.get('name') as string)?.trim()
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    const password = formData.get('password') as string
    const role = formData.get('role') as string
    const permissions = formData.getAll('permissions') as string[]

    if (!name || !email || !password) {
      return { error: 'Name, email, and password are required.' }
    }

    await connectDB()

    if (await User.findOne({ email })) {
      return { error: 'A user with that email already exists.' }
    }

    const hashed = await hash(password, 10)
    await User.create({ name, email, password: hashed, role: role || 'viewer', permissions })
    revalidatePath('/admin/users')
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function updateUser(_: unknown, formData: FormData) {
  try {
    await requireAuth()

    const id = formData.get('id') as string
    const name = (formData.get('name') as string)?.trim()
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    const password = formData.get('password') as string
    const role = formData.get('role') as string
    const permissions = formData.getAll('permissions') as string[]

    if (!name || !email) return { error: 'Name and email are required.' }

    await connectDB()

    const update: Record<string, unknown> = { name, email, role, permissions }
    if (password) update.password = await hash(password, 10)

    await User.findByIdAndUpdate(id, update)
    revalidatePath('/admin/users')
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function deleteUser(userId: string) {
  try {
    await requireAuth()
    await connectDB()
    await User.findByIdAndDelete(userId)
    revalidatePath('/admin/users')
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
