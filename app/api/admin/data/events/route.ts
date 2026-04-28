import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'

const PAGE_SIZE = 25

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const q = searchParams.get('q')?.trim() ?? ''

  await connectDB()

  const filter = q
    ? {
        $or: [
          { code: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
          { city: { $regex: q, $options: 'i' } },
          { districtCode: { $regex: q, $options: 'i' } },
          { type: { $regex: q, $options: 'i' } },
        ],
      }
    : {}

  const [total, data] = await Promise.all([
    FrcEvent.countDocuments(filter),
    FrcEvent.find(filter)
      .select('code name city districtCode dateStart type')
      .sort({ dateStart: 1, code: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
  ])

  return Response.json({ data, total, page, pageSize: PAGE_SIZE })
}
