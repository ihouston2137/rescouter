'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ScoutRadiozConfigPanel from './ScoutRadiozConfigPanel'

type ProcessResult = { count?: number; message?: string; error?: string }

type SortKey = 'season' | 'eventCode' | 'teamNumber' | 'tournamentLevel' | 'matchNumber' | 'org_key'
type SortDir = 'asc' | 'desc'

type ScoutRadiozRow = {
  _id: string
  org_key: string
  season: number
  eventCode: string
  teamNumber: number
  tournamentLevel: string
  matchNumber: number
}

type ScoutRadiozDetail = ScoutRadiozRow & { data: Record<string, string> }

type ScoutRadiozPage = {
  rows: ScoutRadiozRow[]
  total: number
  page: number
  pageSize: number
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProcessCard({
  title,
  description,
  buttonLabel,
  onRun,
  loading,
  result,
}: {
  title: string
  description: string
  buttonLabel: string
  onRun: () => void
  loading: boolean
  result: ProcessResult | null
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-1 text-lg font-medium text-zinc-900 dark:text-zinc-50">{title}</h2>
      <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      <button
        onClick={onRun}
        disabled={loading}
        className="h-10 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? 'Processing…' : buttonLabel}
      </button>
      {result && (
        <p className={`mt-4 text-sm ${result.error ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {result.error ? `Error: ${result.error}` : result.message}
        </p>
      )}
    </div>
  )
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-zinc-300 dark:text-zinc-600">↕</span>
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [detail, setDetail]   = useState<ScoutRadiozDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/scoutradioz/${id}`)
      .then(r => r.json())
      .then(json => { if (!cancelled) { if (json.error) setError(json.error); else setDetail(json) } })
      .catch(() => { if (!cancelled) setError('Network error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const dataEntries = detail?.data ? Object.entries(detail.data) : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Record Detail</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4">
          {loading && <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">Loading…</p>}
          {error   && <p className="py-8 text-center text-sm text-red-500">Error: {error}</p>}
          {detail  && (
            <div className="space-y-5">
              {/* Fixed fields */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Record</p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                  {(
                    [
                      ['Season',           detail.season],
                      ['Event Code',       detail.eventCode],
                      ['Team Number',      detail.teamNumber],
                      ['Tournament Level', detail.tournamentLevel],
                      ['Match Number',     detail.matchNumber],
                      ['Org',              detail.org_key],
                    ] as [string, string | number][]
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-zinc-400 dark:text-zinc-500">{label}</dt>
                      <dd className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Scouting data */}
              {dataEntries.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    Scouting Data ({dataEntries.length} fields)
                  </p>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                    {dataEntries.map(([key, val]) => (
                      <div key={key}>
                        <dt className="truncate text-xs text-zinc-400 dark:text-zinc-500">{key}</dt>
                        <dd className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{val === '' ? '—' : val}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProcessDashboard() {
  const [allianceResult, setAllianceResult]           = useState<ProcessResult | null>(null)
  const [generatingAlliances, setGeneratingAlliances] = useState(false)

  const [latestResult, setLatestResult]         = useState<ProcessResult | null>(null)
  const [generatingLatest, setGeneratingLatest] = useState(false)

  const [scoutradiozResult, setScoutradiozResult]       = useState<ProcessResult | null>(null)
  const [importingScoutradioz, setImportingScoutradioz] = useState(false)
  const [scoutradiozFile, setScoutradiozFile]           = useState<File | null>(null)
  const [eventCodeSelected, setEventCodeSelected]       = useState('')
  const [eventCodeManual, setEventCodeManual]           = useState('')
  const [activeEvents, setActiveEvents]                 = useState<{ code: string; name: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [srSummaryResult, setSrSummaryResult]         = useState<ProcessResult | null>(null)
  const [processingSrSummary, setProcessingSrSummary] = useState(false)

  // ScoutRadioz table
  const [filterEvent, setFilterEvent] = useState('')
  const [filterTeam, setFilterTeam]   = useState('')
  const [filterOrg, setFilterOrg]     = useState('')
  const [orgs, setOrgs]               = useState<string[]>([])
  const [srPage, setSrPage]           = useState(0)
  const [sortKey, setSortKey]         = useState<SortKey>('season')
  const [sortDir, setSortDir]         = useState<SortDir>('desc')
  const [srData, setSrData]           = useState<ScoutRadiozPage | null>(null)
  const [srLoading, setSrLoading]     = useState(false)
  const [srError, setSrError]         = useState<string | null>(null)
  const [detailId, setDetailId]       = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/scoutradioz/orgs')
      .then(r => r.json())
      .then((list: string[]) => { if (Array.isArray(list)) setOrgs(list) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/admin/active-events')
      .then(r => r.json())
      .then((list: { code: string; name: string }[]) => { if (Array.isArray(list)) setActiveEvents(list) })
      .catch(() => {})
  }, [])

  async function generateAllianceSummaries() {
    setGeneratingAlliances(true)
    setAllianceResult(null)
    try {
      const res = await fetch('/api/admin/generate-alliance-summaries', { method: 'POST' })
      setAllianceResult(await res.json())
    } catch {
      setAllianceResult({ error: 'Network error' })
    } finally {
      setGeneratingAlliances(false)
    }
  }

  async function generateLatestSummaries() {
    setGeneratingLatest(true)
    setLatestResult(null)
    try {
      const res = await fetch('/api/admin/generate-alliance-summaries-latest', { method: 'POST' })
      setLatestResult(await res.json())
    } catch {
      setLatestResult({ error: 'Network error' })
    } finally {
      setGeneratingLatest(false)
    }
  }

  async function processScoutradiozSummaries() {
    setProcessingSrSummary(true)
    setSrSummaryResult(null)
    try {
      const res = await fetch('/api/admin/process-scoutradioz', { method: 'POST' })
      setSrSummaryResult(await res.json())
    } catch {
      setSrSummaryResult({ error: 'Network error' })
    } finally {
      setProcessingSrSummary(false)
    }
  }

  async function importScoutradioz() {
    if (!scoutradiozFile) return
    setImportingScoutradioz(true)
    setScoutradiozResult(null)
    try {
      const form = new FormData()
      form.append('file', scoutradiozFile)
      if (eventCodeSelected) form.append('eventCodeSelected', eventCodeSelected)
      if (eventCodeManual.trim()) form.append('eventCodeManual', eventCodeManual.trim())
      const res = await fetch('/api/admin/import-scoutradioz', { method: 'POST', body: form })
      setScoutradiozResult(await res.json())
    } catch {
      setScoutradiozResult({ error: 'Network error' })
    } finally {
      setImportingScoutradioz(false)
    }
  }

  const fetchSrData = useCallback(async (
    page: number,
    eventCode: string,
    teamNumber: string,
    orgKey: string,
    key: SortKey,
    dir: SortDir,
  ) => {
    setSrLoading(true)
    setSrError(null)
    try {
      const params = new URLSearchParams({ page: String(page), sortKey: key, sortDir: dir })
      if (eventCode.trim()) params.set('eventCode', eventCode.trim())
      if (teamNumber.trim()) params.set('teamNumber', teamNumber.trim())
      if (orgKey) params.set('orgKey', orgKey)
      const res  = await fetch(`/api/admin/scoutradioz?${params}`)
      const json = await res.json()
      if (json.error) setSrError(json.error)
      else setSrData(json)
    } catch {
      setSrError('Network error')
    } finally {
      setSrLoading(false)
    }
  }, [])

  function handleSrSearch() {
    setSrPage(0)
    fetchSrData(0, filterEvent, filterTeam, filterOrg, sortKey, sortDir)
  }

  function handleSrPage(next: number) {
    setSrPage(next)
    fetchSrData(next, filterEvent, filterTeam, filterOrg, sortKey, sortDir)
  }

  function handleSort(key: SortKey) {
    const newDir: SortDir = key === sortKey && sortDir === 'asc' ? 'desc' : 'asc'
    setSortKey(key)
    setSortDir(newDir)
    setSrPage(0)
    fetchSrData(0, filterEvent, filterTeam, filterOrg, key, newDir)
  }

  const totalPages = srData ? Math.ceil(srData.total / srData.pageSize) : 0

  const columns: { label: string; key: SortKey | null }[] = [
    { label: '#',       key: null },
    { label: 'Season',  key: 'season' },
    { label: 'Event',   key: 'eventCode' },
    { label: 'Team',    key: 'teamNumber' },
    { label: 'Level',   key: 'tournamentLevel' },
    { label: 'Match',   key: 'matchNumber' },
    { label: 'Org',     key: 'org_key' },
  ]

  return (
    <div className="space-y-8">
      {/* Process cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        <ProcessCard
          title="Alliance Data Summaries"
          description="For each past event and each attending team, compute five-number summaries (min, Q1, median, Q3, max) for alliance auto and final scores across all matches played."
          buttonLabel="Generate Alliance Data Summaries"
          onRun={generateAllianceSummaries}
          loading={generatingAlliances}
          result={allianceResult}
        />
        <ProcessCard
          title="Latest Alliance Data Summaries"
          description="Process all completed events oldest to newest, copying each team's alliance summary into a per-season latest table. Each team's record reflects their most recently completed event."
          buttonLabel="Get Latest Alliance Data Summaries"
          onRun={generateLatestSummaries}
          loading={generatingLatest}
          result={latestResult}
        />
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-1 text-lg font-medium text-zinc-900 dark:text-zinc-50">Import ScoutRadioz Data</h2>
          <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
            Upload a CSV export from ScoutRadioz. The file will be saved locally and all records upserted into the database keyed by org, season, event, team, and match.
          </p>

          {/* File picker row */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => setScoutradiozFile(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importingScoutradioz}
              className="h-10 rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Choose CSV…
            </button>
            {scoutradiozFile && (
              <span className="max-w-50 truncate text-sm text-zinc-500 dark:text-zinc-400">
                {scoutradiozFile.name}
              </span>
            )}
          </div>

          {/* Event code override */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Event Code Override <span className="font-normal">(optional — leave blank to use the code from the file)</span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {activeEvents.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400 dark:text-zinc-500">This week's events</label>
                  <select
                    value={eventCodeSelected}
                    onChange={e => setEventCodeSelected(e.target.value)}
                    disabled={importingScoutradioz}
                    className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
                  >
                    <option value="">— from file —</option>
                    {activeEvents.map(e => (
                      <option key={e.code} value={e.code}>{e.code}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400 dark:text-zinc-500">Or type a code</label>
                <input
                  type="text"
                  placeholder="e.g. ARCHIMEDES"
                  value={eventCodeManual}
                  onChange={e => setEventCodeManual(e.target.value.toUpperCase())}
                  disabled={importingScoutradioz}
                  className="h-9 w-44 rounded-lg border border-zinc-200 bg-white px-3 text-sm uppercase text-zinc-800 placeholder:normal-case placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
                />
              </div>
              {(eventCodeManual.trim() || eventCodeSelected) && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">Effective override</span>
                  <span className="flex h-9 items-center rounded-lg bg-amber-50 px-3 text-sm font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                    {eventCodeManual.trim() || eventCodeSelected}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Import button */}
          <div className="mt-5">
            <button
              onClick={importScoutradioz}
              disabled={importingScoutradioz || !scoutradiozFile}
              className="h-10 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {importingScoutradioz ? 'Processing…' : 'Import ScoutRadioz Data'}
            </button>
          </div>

          {scoutradiozResult && (
            <p className={`mt-4 text-sm ${scoutradiozResult.error ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {scoutradiozResult.error ? `Error: ${scoutradiozResult.error}` : scoutradiozResult.message}
            </p>
          )}
        </div>
        <ProcessCard
          title="Process ScoutRadioz Summaries"
          description="For every past event, calculate per-team scouting summaries (contribution, reliability, foul, climb, defense, freeze, recover, jam, stuck, tip, top-robot scores) from ScoutRadioz records and upsert into the scoutradioz-summary collection."
          buttonLabel="Process ScoutRadioz Summaries"
          onRun={processScoutradiozSummaries}
          loading={processingSrSummary}
          result={srSummaryResult}
        />
      </div>

      {/* Divider */}
      <hr className="border-zinc-200 dark:border-zinc-700" />

      {/* ScoutRadioz data browser */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">ScoutRadioz Records</h2>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Org</label>
            <select
              value={filterOrg}
              onChange={e => setFilterOrg(e.target.value)}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
            >
              <option value="">All Orgs</option>
              {orgs.map(org => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Event Code</label>
            <input
              type="text"
              placeholder="e.g. CASJ"
              value={filterEvent}
              onChange={e => setFilterEvent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSrSearch()}
              className="h-9 w-36 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Team Number</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 1678"
              value={filterTeam}
              onChange={e => setFilterTeam(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSrSearch()}
              className="h-9 w-28 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
            />
          </div>
          <button
            onClick={handleSrSearch}
            disabled={srLoading}
            className="h-9 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {srLoading ? 'Loading…' : 'Search'}
          </button>
          {srData && (
            <span className="text-sm text-zinc-400 dark:text-zinc-500">
              {srData.total.toLocaleString()} record{srData.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {srError && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">Error: {srError}</p>
        )}

        {srData && (
          <>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    {columns.map(col => (
                      <th
                        key={col.label}
                        onClick={col.key ? () => handleSort(col.key!) : undefined}
                        className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 ${col.key ? 'cursor-pointer select-none hover:text-zinc-800 dark:hover:text-zinc-200' : ''}`}
                      >
                        {col.label}
                        {col.key && <SortIndicator active={sortKey === col.key} dir={sortDir} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {srData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="py-10 text-center text-zinc-400 dark:text-zinc-500">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    srData.rows.map((row, i) => (
                      <tr
                        key={row._id}
                        onClick={() => setDetailId(row._id)}
                        className="cursor-pointer border-b border-zinc-50 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                      >
                        <td className="px-4 py-2.5 tabular-nums text-zinc-400 dark:text-zinc-500">
                          {srData.page * srData.pageSize + i + 1}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-zinc-700 dark:text-zinc-300">{row.season}</td>
                        <td className="px-4 py-2.5 font-mono text-zinc-700 dark:text-zinc-300">{row.eventCode}</td>
                        <td className="px-4 py-2.5 tabular-nums text-zinc-700 dark:text-zinc-300">{row.teamNumber}</td>
                        <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{row.tournamentLevel}</td>
                        <td className="px-4 py-2.5 tabular-nums text-zinc-700 dark:text-zinc-300">{row.matchNumber}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">{row.org_key}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-4">
                <button
                  onClick={() => handleSrPage(srPage - 1)}
                  disabled={srPage === 0 || srLoading}
                  className="h-9 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  ← Previous
                </button>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {srPage * srData.pageSize + 1}–{Math.min((srPage + 1) * srData.pageSize, srData.total)} of {srData.total.toLocaleString()}
                </span>
                <button
                  onClick={() => handleSrPage(srPage + 1)}
                  disabled={srPage >= totalPages - 1 || srLoading}
                  className="h-9 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      {detailId && <DetailModal id={detailId} onClose={() => setDetailId(null)} />}

      {/* Divider */}
      <hr className="border-zinc-200 dark:border-zinc-700" />

      {/* ScoutRadioz config */}
      <ScoutRadiozConfigPanel />
    </div>
  )
}
