import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import ScoutRadioz from '@/lib/models/ScoutRadioz'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const orgs: string[] = await ScoutRadioz.distinct('org_key')
  return Response.json(orgs.sort())
}
