import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcTeam from '@/lib/models/Team'

const PAGE_SIZE = 25

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const q = searchParams.get('q')?.trim() ?? ''

  await connectDB()

  const numericQ = q !== '' && /^\d+$/.test(q) ? Number(q) : null

  const filter = q
    ? {
        $or: [
          ...(numericQ !== null ? [{ teamNumber: numericQ }] : []),
          { nameShort: { $regex: q, $options: 'i' } },
          { nameFull: { $regex: q, $options: 'i' } },
          { city: { $regex: q, $options: 'i' } },
          { stateProv: { $regex: q, $options: 'i' } },
        ],
      }
    : {}

  const [total, data] = await Promise.all([
    FrcTeam.countDocuments(filter),
    FrcTeam.find(filter)
      .select('teamNumber nameShort city stateProv rookieYear')
      .sort({ teamNumber: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
  ])

  return Response.json({ data, total, page, pageSize: PAGE_SIZE })
}
