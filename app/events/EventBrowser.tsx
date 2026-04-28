'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export type EventRow = {
  code: string
  name: string
  city: string | null
  stateProv: string | null
  country: string | null
  dateStart: string | null
  dateEnd: string | null
  districtCode: string | null
}

// Returns YYYY-MM-DD of the Monday of the ISO date's UTC week
function weekMonday(iso: string): string {
  const d = new Date(iso)
  const day = d.getUTCDay() // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setUTCDate(d.getUTCDate() + diff)
  return m.toISOString().slice(0, 10)
}

function utcFmt(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' })
}

function weekLabel(mondayStr: string): string {
  const mon = mondayStr + 'T00:00:00Z'
  const sun = new Date(mon)
  sun.setUTCDate(sun.getUTCDate() + 6)
  const short: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${utcFmt(mon, short)} – ${utcFmt(sun.toISOString(), short)}`
}

function location(city: string | null, stateProv: string | null, country: string | null): string {
  const local = [city, stateProv].filter(Boolean).join(', ')
  return [local, country].filter(Boolean).join(' · ')
}

function dateRange(start: string | null, end: string | null): string {
  if (!start) return '—'
  const short: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const year = new Date(start).getUTCFullYear()
  const startStr = utcFmt(start, short)
  if (!end) return `${startStr}, ${year}`
  const s = new Date(start)
  const e = new Date(end)
  if (s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear()) {
    return `${startStr} – ${e.getUTCDate()}, ${year}`
  }
  return `${startStr} – ${utcFmt(end, short)}, ${year}`
}

const selectCls =
  'h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-700 ' +
  'focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'

export default function EventBrowser({ events }: { events: EventRow[] }) {
  const [week, setWeek] = useState('')
  const [district, setDistrict] = useState('')

  const weeks = useMemo(() => {
    const seen = new Set<string>()
    for (const e of events) if (e.dateStart) seen.add(weekMonday(e.dateStart))
    return Array.from(seen).sort()
  }, [events])

  const districts = useMemo(() => {
    const seen = new Set<string>()
    for (const e of events) if (e.districtCode) seen.add(e.districtCode)
    return Array.from(seen).sort()
  }, [events])

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (week && (!e.dateStart || weekMonday(e.dateStart) !== week)) return false
        if (district && e.districtCode !== district) return false
        return true
      }),
    [events, week, district]
  )

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select value={week} onChange={(e) => setWeek(e.target.value)} className={selectCls}>
          <option value="">All Weeks</option>
          {weeks.map((w) => (
            <option key={w} value={w}>{weekLabel(w)}</option>
          ))}
        </select>

        <select value={district} onChange={(e) => setDistrict(e.target.value)} className={selectCls}>
          <option value="">All Districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {(week || district) && (
          <button
            onClick={() => { setWeek(''); setDistrict('') }}
            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Clear
          </button>
        )}

        <span className="ml-auto text-sm text-zinc-400 dark:text-zinc-500">
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Event grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">No events match the selected filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <Link
              key={e.code}
              href={`/events/${e.code}`}
              className="block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/70"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                  {e.name || '—'}
                </span>
                <span className="shrink-0 font-mono text-xs text-zinc-400 dark:text-zinc-500">
                  {e.code}
                </span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-0.5">
                {location(e.city, e.stateProv, e.country) || '—'}
              </p>
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                {dateRange(e.dateStart, e.dateEnd)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
