'use server'

import { redirect } from 'next/navigation'
import { compare, hash } from 'bcrypt-ts'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'
import { createSession, deleteSession } from '@/lib/session'

export async function login(
  prevState: { error?: string } | undefined,
  formData: FormData
) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  await connectDB()
  const user = await User.findOne({ email })

  if (!user || !(await compare(password, user.password))) {
    return { error: 'Invalid email or password.' }
  }

  await createSession(user._id.toString())
  redirect('/admin')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}

export async function createDevUser(email: string, password: string, name: string) {
  await connectDB()
  const existing = await User.findOne({ email })
  if (existing) return { error: 'User already exists.' }
  const hashed = await hash(password, 10)
  await User.create({ email, password: hashed, name, role: 'admin' })
  return { success: true }
}
