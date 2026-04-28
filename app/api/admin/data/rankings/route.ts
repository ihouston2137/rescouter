import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import Ranking from '@/lib/models/Ranking'

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
          { eventCode: { $regex: q, $options: 'i' } },
          ...(numericQ !== null ? [{ teamNumber: numericQ }, { rank: numericQ }] : []),
        ],
      }
    : {}

  const [total, data] = await Promise.all([
    Ranking.countDocuments(filter),
    Ranking.find(filter)
      .select('eventCode teamNumber rank wins losses ties sortOrder1')
      .sort({ eventCode: 1, rank: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
  ])

  return Response.json({ data, total, page, pageSize: PAGE_SIZE })
}
