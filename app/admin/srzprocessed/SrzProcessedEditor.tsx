'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SrzRow {
  _id: string
  org_key: string
  season: number
  eventCode: string
  teamNumber: number
  tournamentLevel: string
  matchNumber: number
  startPosition?: string
  endgameClimbLevel?: string
  autoScoredFuel?: number
  autoCycles?: number
  autoScore?: number
  autoClimb?: number
  teleScoredFuel?: number
  teleFuelCycles?: number
  teleScore?: number
  totalScore?: number
  telePassCycles?: number
  endgameClimb?: number
  passNeutral?: number
  passOpposite?: number
  beached?: number
  stuckTrench?: number
  stuckBump?: number
  damaged?: number
  died?: number
  tipped?: number
  accuracyRating?: number
  skillRating?: number
  defenseRating?: number
}

type CellAddress = { id: string; field: string }

// ── Column definitions ────────────────────────────────────────────────────────

type ColDef = {
  key: keyof SrzRow
  label: string
  width: number
  sticky?: boolean
  readonly?: boolean
  type: 'string' | 'number' | 'bool'
}

const COLS: ColDef[] = [
  { key: 'eventCode',        label: 'Event',      width: 90,  sticky: true, readonly: true, type: 'string' },
  { key: 'teamNumber',       label: 'Team',        width: 70,  sticky: true, readonly: true, type: 'number' },
  { key: 'matchNumber',      label: 'Match',       width: 64,  readonly: true,  type: 'number' },
  { key: 'tournamentLevel',  label: 'Level',       width: 108, readonly: true,  type: 'string' },
  { key: 'org_key',          label: 'Org',         width: 100, readonly: true,  type: 'string' },
  { key: 'season',           label: 'Season',      width: 72,  readonly: true,  type: 'number' },
  { key: 'startPosition',    label: 'Start Pos',   width: 90,  type: 'string' },
  { key: 'autoScoredFuel',   label: 'Auto Fuel',   width: 84,  type: 'bool' },
  { key: 'autoCycles',       label: 'Auto Cyc',    width: 80,  type: 'number' },
  { key: 'autoScore',        label: 'Auto Scr',    width: 80,  type: 'number' },
  { key: 'autoClimb',        label: 'Auto Clmb',   width: 84,  type: 'bool' },
  { key: 'teleScoredFuel',   label: 'Tele Fuel',   width: 80,  type: 'bool' },
  { key: 'teleFuelCycles',   label: 'Tele Cyc',    width: 76,  type: 'number' },
  { key: 'teleScore',        label: 'Tele Scr',    width: 76,  type: 'number' },
  { key: 'totalScore',       label: 'Total',       width: 70,  type: 'number' },
  { key: 'telePassCycles',   label: 'Pass Cyc',    width: 76,  type: 'number' },
  { key: 'endgameClimb',     label: 'End Clmb',    width: 80,  type: 'bool' },
  { key: 'endgameClimbLevel',label: 'Clmb Lvl',    width: 84,  type: 'string' },
  { key: 'passNeutral',      label: 'Pass Neut',   width: 84,  type: 'bool' },
  { key: 'passOpposite',     label: 'Pass Opp',    width: 82,  type: 'bool' },
  { key: 'beached',          label: 'Beached',     width: 76,  type: 'bool' },
  { key: 'stuckTrench',      label: 'Stk Trench',  width: 88,  type: 'bool' },
  { key: 'stuckBump',        label: 'Stk Bump',    width: 80,  type: 'bool' },
  { key: 'damaged',          label: 'Damaged',     width: 76,  type: 'bool' },
  { key: 'died',             label: 'Died',        width: 60,  type: 'bool' },
  { key: 'tipped',           label: 'Tipped',      width: 68,  type: 'bool' },
  { key: 'accuracyRating',   label: 'Accuracy',    width: 80,  type: 'number' },
  { key: 'skillRating',      label: 'Skill',       width: 68,  type: 'number' },
  { key: 'defenseRating',    label: 'Defense',     width: 76,  type: 'number' },
]

const STICKY_COUNT = COLS.filter(c => c.sticky).length

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayVal(col: ColDef, row: SrzRow): string {
  const v = row[col.key]
  if (v === undefined || v === null || v === '') return ''
  if (col.type === 'bool') return (v as number) === 1 ? '1' : '0'
  return String(v)
}

function boolDot(v: number | undefined) {
  if (v === undefined || v === null) return <span className="text-zinc-300">·</span>
  return v === 1
    ? <span className="text-emerald-500 font-bold">✓</span>
    : <span className="text-zinc-400">–</span>
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SrzProcessedEditor() {
  const [rows, setRows]           = useState<SrzRow[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(0)
  const pageSize                  = 100
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState<string | null>(null) // id being saved
  const [error, setError]         = useState<string | null>(null)

  // Filters
  const [fEvent,  setFEvent]  = useState('')
  const [fTeam,   setFTeam]   = useState('')
  const [fOrg,    setFOrg]    = useState('')
  const [fSeason, setFSeason] = useState('')

  // Sort
  const [sortKey, setSortKey] = useState('eventCode')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Inline edit
  const [editing, setEditing]       = useState<CellAddress | null>(null)
  const [editVal, setEditVal]       = useState('')
  const inputRef                    = useRef<HTMLInputElement>(null)

  // Row selection
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [deleting, setDeleting]     = useState(false)

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(p),
        pageSize: String(pageSize),
        sortKey,
        sortDir,
      })
      if (fEvent.trim())  params.set('eventCode',  fEvent.trim().toUpperCase())
      if (fTeam.trim())   params.set('teamNumber', fTeam.trim())
      if (fOrg.trim())    params.set('orgKey',     fOrg.trim())
      if (fSeason.trim()) params.set('season',     fSeason.trim())

      const res  = await fetch(`/api/admin/srzprocessed?${params}`)
      const data = await res.json()
      setRows(data.rows ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [fEvent, fTeam, fOrg, fSeason, sortKey, sortDir])

  useEffect(() => { fetchRows(0) }, [fetchRows])

  // ── Sort toggle ─────────────────────────────────────────────────────────────

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // ── Inline edit ─────────────────────────────────────────────────────────────

  function startEdit(row: SrzRow, col: ColDef) {
    if (col.readonly) return
    const v = row[col.key]
    setEditVal(v === undefined || v === null ? '' : String(v))
    setEditing({ id: row._id, field: col.key as string })
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function commitEdit() {
    if (!editing) return
    const { id, field } = editing
    setEditing(null)

    const col = COLS.find(c => c.key === field)!
    let parsed: string | number | null = editVal === '' ? null : editVal
    if (col.type === 'number' || col.type === 'bool') {
      parsed = editVal === '' ? null : Number(editVal)
    }

    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: parsed ?? undefined } : r))
    setSaving(id)
    try {
      const res = await fetch(`/api/admin/srzprocessed/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: parsed }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Save failed')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(null)
    }
  }

  function cancelEdit() { setEditing(null) }

  // Bool toggle — click flips 0↔1 without text input
  async function toggleBool(row: SrzRow, col: ColDef) {
    if (col.readonly || col.type !== 'bool') return
    const cur = row[col.key] as number | undefined
    const next = cur === 1 ? 0 : 1
    setRows(prev => prev.map(r => r._id === row._id ? { ...r, [col.key]: next } : r))
    setSaving(row._id)
    try {
      await fetch(`/api/admin/srzprocessed/${row._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [col.key]: next }),
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(null)
    }
  }

  // ── Selection + delete ──────────────────────────────────────────────────────

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === rows.length && rows.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map(r => r._id)))
    }
  }

  async function deleteSelected() {
    if (!selected.size) return
    setDeleting(true)
    try {
      await Promise.all([...selected].map(id =>
        fetch(`/api/admin/srzprocessed/${id}`, { method: 'DELETE' }),
      ))
      setSelected(new Set())
      fetchRows(page)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  // ── Sticky offsets ──────────────────────────────────────────────────────────

  // checkbox col (32px) + sticky data cols
  const stickyOffsets: number[] = [0]
  let offset = 32
  for (let i = 0; i < STICKY_COUNT; i++) {
    stickyOffsets.push(offset)
    offset += COLS[i].width
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">SRz Processed</h1>
        <span className="text-sm text-zinc-400">{total.toLocaleString()} records</span>
        {saving && <span className="text-xs text-blue-500">Saving…</span>}
        {error  && (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {error}
            <button className="ml-1 underline" onClick={() => setError(null)}>dismiss</button>
          </span>
        )}
        {selected.size > 0 && (
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="ml-auto rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : `Delete ${selected.size} row${selected.size > 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Event', val: fEvent, set: setFEvent },
          { label: 'Team',  val: fTeam,  set: setFTeam  },
          { label: 'Org',   val: fOrg,   set: setFOrg   },
          { label: 'Season',val: fSeason,set: setFSeason },
        ].map(({ label, val, set }) => (
          <div key={label} className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 pointer-events-none">
              {label}
            </span>
            <input
              value={val}
              onChange={e => set(e.target.value)}
              className="rounded border border-zinc-200 bg-white pl-12 pr-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="any"
            />
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="relative overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm">
        <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
          {/* col widths */}
          <colgroup>
            <col style={{ width: 32 }} />
            {COLS.map(c => <col key={c.key as string} style={{ width: c.width }} />)}
          </colgroup>

          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900">
              {/* select-all checkbox */}
              <th
                className="sticky left-0 z-20 border-b border-r border-zinc-200 bg-zinc-50 px-2 dark:border-zinc-800 dark:bg-zinc-900"
                style={{ width: 32 }}
              >
                <input
                  type="checkbox"
                  checked={selected.size === rows.length && rows.length > 0}
                  onChange={toggleAll}
                  className="accent-blue-600"
                />
              </th>

              {COLS.map((col, ci) => {
                const isSticky = ci < STICKY_COUNT
                const left = isSticky ? stickyOffsets[ci + 1] : undefined
                const isSorted = sortKey === (col.key as string)
                return (
                  <th
                    key={col.key as string}
                    onClick={() => toggleSort(col.key as string)}
                    className={`select-none border-b border-r border-zinc-200 px-2 py-2 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide cursor-pointer hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 whitespace-nowrap overflow-hidden text-ellipsis ${
                      isSticky ? 'sticky z-10 bg-zinc-50 dark:bg-zinc-900' : ''
                    }`}
                    style={{ left, width: col.width }}
                  >
                    {col.label}
                    {isSorted && (
                      <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={COLS.length + 1} className="py-12 text-center text-zinc-400">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COLS.length + 1} className="py-12 text-center text-zinc-400">
                  No records match your filters.
                </td>
              </tr>
            ) : (
              rows.map((row, ri) => {
                const isSelected = selected.has(row._id)
                const isSaving   = saving === row._id
                return (
                  <tr
                    key={row._id}
                    className={`group ${ri % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-zinc-50/50 dark:bg-zinc-900/50'} ${
                      isSelected ? 'ring-1 ring-inset ring-blue-400' : ''
                    } ${isSaving ? 'opacity-60' : ''}`}
                  >
                    {/* Checkbox */}
                    <td
                      className="sticky left-0 z-10 border-b border-r border-zinc-100 px-2 dark:border-zinc-800"
                      style={{
                        background: isSelected ? 'rgb(219 234 254)' : ri % 2 === 0 ? 'white' : 'rgb(250 250 250)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(row._id)}
                        className="accent-blue-600"
                      />
                    </td>

                    {COLS.map((col, ci) => {
                      const isSticky  = ci < STICKY_COUNT
                      const left      = isSticky ? stickyOffsets[ci + 1] : undefined
                      const isEditing = editing?.id === row._id && editing?.field === (col.key as string)

                      // Background for sticky cells
                      const stickyBg = isSelected
                        ? 'rgb(219 234 254)'
                        : ri % 2 === 0 ? 'white' : 'rgb(250 250 250)'

                      if (isEditing) {
                        return (
                          <td
                            key={col.key as string}
                            className="border-b border-r border-zinc-100 p-0 dark:border-zinc-800"
                            style={{ left, position: isSticky ? 'sticky' : undefined, zIndex: isSticky ? 10 : undefined, background: isSticky ? stickyBg : undefined }}
                          >
                            <input
                              ref={inputRef}
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={e => {
                                if (e.key === 'Enter')  { e.preventDefault(); commitEdit() }
                                if (e.key === 'Escape') { e.preventDefault(); cancelEdit()  }
                              }}
                              className="w-full h-full px-2 py-1.5 text-sm bg-blue-50 dark:bg-blue-950 outline-none ring-2 ring-blue-500"
                              autoFocus
                            />
                          </td>
                        )
                      }

                      // Bool cell — click to toggle
                      if (col.type === 'bool' && !col.readonly) {
                        const v = row[col.key] as number | undefined
                        return (
                          <td
                            key={col.key as string}
                            onClick={() => toggleBool(row, col)}
                            className="border-b border-r border-zinc-100 px-2 py-1.5 text-center cursor-pointer select-none hover:bg-blue-50 dark:border-zinc-800 dark:hover:bg-blue-950/30"
                            style={{ left, position: isSticky ? 'sticky' : undefined, zIndex: isSticky ? 10 : undefined, background: isSticky ? stickyBg : undefined }}
                          >
                            {boolDot(v)}
                          </td>
                        )
                      }

                      // Read-only or editable text/number cell
                      return (
                        <td
                          key={col.key as string}
                          onClick={() => !col.readonly && startEdit(row, col)}
                          className={`border-b border-r border-zinc-100 px-2 py-1.5 dark:border-zinc-800 overflow-hidden text-ellipsis whitespace-nowrap ${
                            col.readonly
                              ? 'text-zinc-500 dark:text-zinc-400'
                              : 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 text-zinc-900 dark:text-zinc-50'
                          }`}
                          style={{ left, position: isSticky ? 'sticky' : undefined, zIndex: isSticky ? 10 : undefined, background: isSticky ? stickyBg : undefined }}
                          title={displayVal(col, row)}
                        >
                          {displayVal(col, row)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <span>
          Page {page + 1} of {totalPages} · {total.toLocaleString()} total
        </span>
        <div className="ml-auto flex gap-1">
          <button
            disabled={page === 0 || loading}
            onClick={() => fetchRows(0)}
            className="rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            «
          </button>
          <button
            disabled={page === 0 || loading}
            onClick={() => fetchRows(page - 1)}
            className="rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ‹ Prev
          </button>
          <button
            disabled={page + 1 >= totalPages || loading}
            onClick={() => fetchRows(page + 1)}
            className="rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Next ›
          </button>
          <button
            disabled={page + 1 >= totalPages || loading}
            onClick={() => fetchRows(totalPages - 1)}
            className="rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            »
          </button>
        </div>
      </div>
    </div>
  )
}
