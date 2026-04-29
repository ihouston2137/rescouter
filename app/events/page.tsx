import Link from 'next/link'
import connectDB from '@/lib/db'
import FrcEvent from '@/lib/models/Event'
import EventBrowser from './EventBrowser'
import type { EventRow } from './EventBrowser'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  await connectDB()

  const raw = await FrcEvent.find({})
    .select('code name city stateProv country dateStart dateEnd districtCode')
    .sort({ dateStart: 1, code: 1 })
    .lean()

  const events: EventRow[] = raw.map((e) => ({
    code: String(e.code ?? ''),
    name: String(e.name ?? ''),
    city: (e.city as string) ?? null,
    stateProv: (e.stateProv as string) ?? null,
    country: (e.country as string) ?? null,
    dateStart: e.dateStart ? (e.dateStart as Date).toISOString() : null,
    dateEnd: e.dateEnd ? (e.dateEnd as Date).toISOString() : null,
    districtCode: (e.districtCode as string) ?? null,
  }))

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          ← Home
        </Link>
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Event Browser
        </h1>
        <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
          {events.length} events · {process.env.Season ?? '2026'} season
        </p>
        <EventBrowser events={events} />
      </div>
    </div>
  )
}
