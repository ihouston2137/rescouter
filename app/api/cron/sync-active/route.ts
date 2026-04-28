import { syncActiveEvents } from '@/lib/syncActive'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await syncActiveEvents()
    return Response.json(result)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
