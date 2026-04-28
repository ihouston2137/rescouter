'use client'

import { useState, useEffect } from 'react'

type Tab = 'events' | 'teams' | 'rankings' | 'matches'

type ColumnDef = {
  key: string
  label: string
  render?: (row: Record<string, unknown>) => React.ReactNode
}

type TableConfig = {
  label: string
  endpoint: string
  columns: ColumnDef[]
}

// ─── Column definitions ──────────────────────────────────────────────────────
// Edit the `columns` array for each tab to change which 5 fields are displayed.

const TABLE_CONFIGS: Record<Tab, TableConfig> = {
  events: {
    label: 'Events',
    endpoint: '/api/admin/data/events',
    columns: [
      { key: 'code',      label: 'Code' },
      { key: 'name',      label: 'Event Name' },
      { key: 'city',      label: 'City' },
      { key: 'districtCode', label: 'District' },
      {
        key: 'dateStart',
        label: 'Start Date',
        render: (row) =>
          row.dateStart
            ? new Date(row.dateStart as string).toLocaleDateString()
            : '—',
      },
    ],
  },

  teams: {
    label: 'Teams',
    endpoint: '/api/admin/data/teams',
    columns: [
      { key: 'teamNumber', label: '#' },
      { key: 'nameShort',  label: 'Name' },
      { key: 'city',       label: 'City' },
      { key: 'stateProv',  label: 'State/Prov' },
      { key: 'rookieYear', label: 'Rookie Year' },
    ],
  },

  rankings: {
    label: 'Rankings',
    endpoint: '/api/admin/data/rankings',
    columns: [
      { key: 'eventCode',   label: 'Event' },
      { key: 'teamNumber',  label: 'Team #' },
      { key: 'rank',        label: 'Rank' },
      {
        key: '_record',
        label: 'Record (W-L-T)',
        render: (row) => `${row.wins ?? 0}–${row.losses ?? 0}–${row.ties ?? 0}`,
      },
      { key: 'sortOrder1',  label: 'Ranking Score' },
    ],
  },

  matches: {
    label: 'Matches',
    endpoint: '/api/admin/data/matches',
    columns: [
      { key: 'eventCode',      label: 'Event' },
      { key: 'description',    label: 'Description' },
      { key: 'tournamentLevel', label: 'Level' },
      { key: 'matchNumber',    label: 'Match #' },
      {
        key: '_score',
        label: 'Score (R – B)',
        render: (row) =>
          `${row.scoreRedFinal ?? '—'} – ${row.scoreBlueFinal ?? '—'}`,
      },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────

type ApiResponse = {
  data: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
}

const PAGE_SIZE = 25

export default function DataViewer() {
  const [activeTab, setActiveTab] = useState<Tab>('events')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce search input by 300 ms
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset state when switching tabs
  useEffect(() => {
    setSearch('')
    setDebouncedSearch('')
    setPage(1)
    setResult(null)
    setError(null)
  }, [activeTab])

  // Fetch data whenever tab, page, or debounced search changes
  useEffect(() => {
    const { endpoint } = TABLE_CONFIGS[activeTab]
    const url = `${endpoint}?page=${page}&q=${encodeURIComponent(debouncedSearch)}`
    let cancelled = false

    setLoading(true)
    setError(null)

    fetch(url)
      .then(r => r.json())
      .then((data: ApiResponse) => {
        if (!cancelled) {
          setResult(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load data.')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [activeTab, page, debouncedSearch])

  const config = TABLE_CONFIGS[activeTab]
  const totalPages = result ? Math.ceil(result.total / PAGE_SIZE) : 0
  const tabs = Object.keys(TABLE_CONFIGS) as Tab[]

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-5 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            {TABLE_CONFIGS[tab].label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${config.label.toLowerCase()}…`}
          className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                {config.columns.map(col => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading && (
                <tr>
                  <td
                    colSpan={config.columns.length}
                    className="px-4 py-10 text-center text-sm text-zinc-400"
                  >
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td
                    colSpan={config.columns.length}
                    className="px-4 py-10 text-center text-sm text-red-500"
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && result?.data.length === 0 && (
                <tr>
                  <td
                    colSpan={config.columns.length}
                    className="px-4 py-10 text-center text-sm text-zinc-400"
                  >
                    No results.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                result?.data.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    {config.columns.map(col => (
                      <td
                        key={col.key}
                        className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300"
                      >
                        {col.render
                          ? col.render(row)
                          : (row[col.key] as string | number | null | undefined) ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {result && result.total > 0 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {result.total.toLocaleString()} total &middot; page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 rounded-lg border border-zinc-200 px-3 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 rounded-lg border border-zinc-200 px-3 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
