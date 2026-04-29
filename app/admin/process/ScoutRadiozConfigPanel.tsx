'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type ConfigDoc, type FieldMapping, type SourceFieldDef, type ConditionDef,
  type OutputType, type MathOp, type CompareOp,
  OUTPUT_FIELDS, makeDefaultConfig, normalizeConfig,
} from '@/lib/scoutradiozProcess'

// ── Constants ─────────────────────────────────────────────────────────────────

const COMPARE_OPS: { value: CompareOp; label: string }[] = [
  { value: '==',       label: '= equals' },
  { value: '!=',       label: '≠ not equals' },
  { value: '>',        label: '> greater' },
  { value: '<',        label: '< less' },
  { value: '>=',       label: '≥ ≥ equal' },
  { value: '<=',       label: '≤ ≤ equal' },
  { value: 'contains', label: 'contains' },
  { value: 'exists',   label: 'exists' },
]

const MATH_OPS: MathOp[] = ['+', '-', '*', '/']

// ── Shared input styles ───────────────────────────────────────────────────────

const inputCls = 'h-7 rounded border border-zinc-200 bg-white px-2 text-xs text-zinc-800 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500'
const selectCls = inputCls + ' cursor-pointer'
const btnSmCls  = 'h-7 rounded px-2 text-xs font-medium'
const btnGhost  = btnSmCls + ' border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
const btnDanger = btnSmCls + ' text-red-500 hover:text-red-700 dark:hover:text-red-400'
const btnPrimary = btnSmCls + ' bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200'

// ── Type helpers ──────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: OutputType }) {
  const cls = type === 'string'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    : type === 'number'
    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  return <span className={`ml-1 rounded px-1 py-0.5 text-[10px] font-medium ${cls}`}>{type}</span>
}

function FieldInput({ value, onChange, list, placeholder, width = 'w-36' }: {
  value: string; onChange: (v: string) => void
  list: string; placeholder?: string; width?: string
}) {
  return (
    <input
      className={`${inputCls} ${width}`}
      value={value}
      onChange={e => onChange(e.target.value)}
      list={list}
      placeholder={placeholder ?? 'field'}
      autoComplete="off"
    />
  )
}

// ── Strategy-specific config editors ─────────────────────────────────────────

function CopyConfig({ mapping, onChange, listId }: {
  mapping: FieldMapping; onChange: (u: Partial<FieldMapping>) => void; listId: string
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-zinc-400">from</span>
      <FieldInput value={mapping.sourceField ?? ''} onChange={v => onChange({ sourceField: v })} list={listId} />
    </div>
  )
}

function MultiConfig({ mapping, onChange, listId }: {
  mapping: FieldMapping; onChange: (u: Partial<FieldMapping>) => void; listId: string
}) {
  const fields  = mapping.sourceFields ?? []
  const isNum   = mapping.outputType === 'number'

  function updateField(i: number, upd: Partial<SourceFieldDef>) {
    const next = fields.map((f, idx) => idx === i ? { ...f, ...upd } : f)
    onChange({ sourceFields: next })
  }
  function addField() {
    onChange({ sourceFields: [...fields, { field: '', mathOp: '+' }] })
  }
  function removeField(i: number) {
    onChange({ sourceFields: fields.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {fields.map((sf, i) => (
        <div key={i} className="flex items-center gap-1">
          {isNum && i > 0 && (
            <select
              className={`${selectCls} w-12`}
              value={sf.mathOp ?? '+'}
              onChange={e => updateField(i, { mathOp: e.target.value as MathOp })}
            >
              {MATH_OPS.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          )}
          <FieldInput value={sf.field} onChange={v => updateField(i, { field: v })} list={listId} width="w-32" />
          <button onClick={() => removeField(i)} className={`${btnDanger} px-1`}>×</button>
        </div>
      ))}
      {!isNum && fields.length > 1 && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-400">sep:</span>
          <input
            className={`${inputCls} w-12`}
            value={mapping.separator ?? ''}
            onChange={e => onChange({ separator: e.target.value })}
            placeholder=" "
          />
        </div>
      )}
      <button onClick={addField} className={btnGhost}>+ field</button>
    </div>
  )
}

function ConditionConfig({ mapping, onChange, listId }: {
  mapping: FieldMapping; onChange: (u: Partial<FieldMapping>) => void; listId: string
}) {
  const conds  = mapping.conditions ?? []
  const isStr  = mapping.outputType === 'string'

  function updateCond(i: number, upd: Partial<ConditionDef>) {
    const next = conds.map((c, idx) => idx === i ? { ...c, ...upd } : c)
    onChange({ conditions: next })
  }
  function addCond() {
    onChange({ conditions: [...conds, { sourceField: '', operator: '==' as CompareOp, value: '' }] })
  }
  function removeCond(i: number) {
    onChange({ conditions: conds.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="flex flex-col gap-1">
      {conds.map((cond, i) => (
        <div key={i} className="flex flex-wrap items-center gap-1">
          <span className="w-5 text-right text-xs text-zinc-400">{i === 0 ? 'IF' : 'OR'}</span>
          <FieldInput value={cond.sourceField} onChange={v => updateCond(i, { sourceField: v })} list={listId} width="w-28" />
          <select
            className={`${selectCls} w-28`}
            value={cond.operator}
            onChange={e => updateCond(i, { operator: e.target.value as CompareOp })}
          >
            {COMPARE_OPS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
          </select>
          {cond.operator !== 'exists' && (
            <input
              className={`${inputCls} w-24`}
              value={cond.value ?? ''}
              onChange={e => updateCond(i, { value: e.target.value })}
              placeholder="value"
            />
          )}
          {isStr && (
            <>
              <span className="text-xs text-zinc-400">→</span>
              <input
                className={`${inputCls} w-24`}
                value={cond.outputValue ?? ''}
                onChange={e => updateCond(i, { outputValue: e.target.value })}
                placeholder="output"
              />
            </>
          )}
          <button onClick={() => removeCond(i)} className={`${btnDanger} px-1`}>×</button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button onClick={addCond} className={btnGhost}>+ condition</button>
        {isStr && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-400">else:</span>
            <input
              className={`${inputCls} w-24`}
              value={mapping.defaultValue ?? ''}
              onChange={e => onChange({ defaultValue: e.target.value })}
              placeholder="default"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mapping row ───────────────────────────────────────────────────────────────

function FieldMappingRow({ mapping, onChange, listId }: {
  mapping: FieldMapping
  onChange: (update: Partial<FieldMapping>) => void
  listId: string
}) {
  const { outputType: type } = mapping

  function handleStrategyChange(strategy: string) {
    onChange({ strategy: strategy as FieldMapping['strategy'], sourceField: '', sourceFields: [], conditions: [], separator: '', defaultValue: '' })
  }

  const strategyOptions = [
    { value: '',          label: '— skip —' },
    { value: 'copy',      label: 'Copy field' },
    ...(type !== 'boolean' ? [{ value: 'multi', label: type === 'number' ? 'Math' : 'Combine' }] : []),
    ...(type !== 'number'  ? [{ value: 'condition', label: 'Condition' }] : []),
  ]

  return (
    <div className="grid grid-cols-[200px_120px_1fr] gap-2 items-start border-b border-zinc-50 py-2 last:border-0 dark:border-zinc-800">
      <div className="flex items-center pt-0.5">
        <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{mapping.outputField}</span>
        <TypeBadge type={type} />
      </div>

      <select
        className={selectCls}
        value={mapping.strategy}
        onChange={e => handleStrategyChange(e.target.value)}
      >
        {strategyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <div>
        {mapping.strategy === 'copy'      && <CopyConfig      mapping={mapping} onChange={onChange} listId={listId} />}
        {mapping.strategy === 'multi'     && <MultiConfig     mapping={mapping} onChange={onChange} listId={listId} />}
        {mapping.strategy === 'condition' && <ConditionConfig mapping={mapping} onChange={onChange} listId={listId} />}
      </div>
    </div>
  )
}

// ── Config list row ───────────────────────────────────────────────────────────

function ConfigListRow({ config, onEdit, onDelete, onRun, running, runResult }: {
  config: ConfigDoc
  onEdit: () => void
  onDelete: () => void
  onRun: () => void
  running: boolean
  runResult: { message?: string; error?: string } | null
}) {
  const configured = config.mappings.filter(m => m.strategy).length
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{config.name || '(unnamed)'}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Season {config.season}
            {config.eventCode ? ` · ${config.eventCode}` : ' · all events'}
            {config.org_key   ? ` · ${config.org_key}`   : ' · all orgs'}
            {' · '}{configured} field{configured !== 1 ? 's' : ''} mapped
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={onRun}
            disabled={running}
            className={`${btnGhost} disabled:opacity-50`}
          >
            {running ? 'Running…' : 'Run'}
          </button>
          <button onClick={onEdit}   className={btnGhost}>Edit</button>
          <button onClick={onDelete} className={`${btnDanger} border border-red-200 dark:border-red-900`}>Delete</button>
        </div>
      </div>
      {runResult && (
        <p className={`mt-1.5 text-xs ${runResult.error ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {runResult.error ? `Error: ${runResult.error}` : runResult.message}
        </p>
      )}
    </div>
  )
}

// ── Preview table ─────────────────────────────────────────────────────────────

type PreviewRecord = {
  org_key: string; season: number; eventCode: string
  teamNumber: number; tournamentLevel: string; matchNumber: number
  output: Record<string, string | number>
}

function PreviewTable({ records, total, mappedFields }: {
  records: PreviewRecord[]; total: number; mappedFields: string[]
}) {
  if (records.length === 0) {
    return <p className="py-6 text-center text-sm text-zinc-400">No matching records in scope.</p>
  }

  return (
    <div>
      <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-500">
        Showing {records.length} of {total.toLocaleString()} matching records
      </p>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
              {['Team', 'Match', 'Level', ...mappedFields].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={i} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30">
                <td className="px-3 py-1.5 tabular-nums">{r.teamNumber}</td>
                <td className="px-3 py-1.5 tabular-nums">{r.matchNumber}</td>
                <td className="px-3 py-1.5">{r.tournamentLevel}</td>
                {mappedFields.map(f => (
                  <td key={f} className="px-3 py-1.5 tabular-nums text-zinc-700 dark:text-zinc-300">
                    {r.output[f] !== undefined ? String(r.output[f]) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function ScoutRadiozConfigPanel() {
  const DATALIST_ID = 'sr-source-fields'

  const [view, setView]             = useState<'list' | 'edit'>('list')
  const [configs, setConfigs]       = useState<ConfigDoc[]>([])
  const [editConfig, setEditConfig] = useState<ConfigDoc>(makeDefaultConfig())
  const [seasons, setSeasons]       = useState<number[]>([])
  const [eventCodes, setEventCodes] = useState<string[]>([])
  const [orgs, setOrgs]             = useState<string[]>([])
  const [sourceFields, setSourceFields] = useState<string[]>([])

  const [previewData, setPreviewData]   = useState<{ records: PreviewRecord[]; total: number } | null>(null)
  const [saving, setSaving]             = useState(false)
  const [previewing, setPreviewing]     = useState(false)
  const [runResult, setRunResult]                   = useState<{ message?: string; error?: string } | null>(null)
  const [running, setRunning]                       = useState(false)
  const [runningId, setRunningId]                   = useState<string | null>(null)
  const [singleRunResults, setSingleRunResults]     = useState<Record<string, { message?: string; error?: string }>>({})
  const [saveMsg, setSaveMsg]           = useState<string | null>(null)

  const loadConfigs = useCallback(async () => {
    const res = await fetch('/api/admin/scoutradioz-config')
    const list = await res.json()
    if (Array.isArray(list)) setConfigs(list.map(normalizeConfig))
  }, [])

  useEffect(() => {
    loadConfigs()
    fetch('/api/admin/scoutradioz/seasons').then(r => r.json()).then((s: number[]) => { if (Array.isArray(s)) setSeasons(s) }).catch(() => {})
    fetch('/api/admin/scoutradioz/orgs').then(r => r.json()).then((o: string[]) => { if (Array.isArray(o)) setOrgs(o) }).catch(() => {})
  }, [loadConfigs])

  useEffect(() => {
    if (!editConfig.season) return
    fetch(`/api/admin/scoutradioz/events?season=${editConfig.season}`)
      .then(r => r.json())
      .then((c: string[]) => { if (Array.isArray(c)) setEventCodes(c) })
      .catch(() => {})
  }, [editConfig.season])

  async function loadSourceFields() {
    const p = new URLSearchParams({ season: String(editConfig.season) })
    if (editConfig.eventCode) p.set('eventCode', editConfig.eventCode)
    if (editConfig.org_key)   p.set('orgKey', editConfig.org_key)
    const res = await fetch(`/api/admin/scoutradioz/fields?${p}`)
    const fields: string[] = await res.json()
    if (Array.isArray(fields)) setSourceFields(fields)
  }

  function handleNewConfig() {
    setEditConfig(makeDefaultConfig())
    setPreviewData(null)
    setSaveMsg(null)
    setView('edit')
  }

  function handleEditConfig(config: ConfigDoc) {
    setEditConfig(normalizeConfig(config))
    setPreviewData(null)
    setSaveMsg(null)
    setView('edit')
  }

  async function handleDeleteConfig(id: string) {
    if (!confirm('Delete this config?')) return
    await fetch(`/api/admin/scoutradioz-config/${id}`, { method: 'DELETE' })
    loadConfigs()
  }

  function updateScope(key: keyof ConfigDoc, value: unknown) {
    setEditConfig(prev => ({ ...prev, [key]: value }))
    setPreviewData(null)
  }

  function updateMapping(index: number, update: Partial<FieldMapping>) {
    setEditConfig(prev => {
      const mappings = prev.mappings.map((m, i) => i === index ? { ...m, ...update } : m)
      return { ...prev, mappings }
    })
    setPreviewData(null)
  }

  async function handlePreview() {
    setPreviewing(true)
    setPreviewData(null)
    try {
      const res  = await fetch('/api/admin/scoutradioz-config/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editConfig),
      })
      const json = await res.json()
      if (!json.error) setPreviewData(json)
    } finally {
      setPreviewing(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res  = await fetch('/api/admin/scoutradioz-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editConfig),
      })
      const json = await res.json()
      if (json.error) {
        setSaveMsg(`Error: ${json.error}`)
      } else {
        setEditConfig(normalizeConfig(json))
        setSaveMsg('Saved.')
        loadConfigs()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleRunAll() {
    setRunning(true)
    setRunResult(null)
    try {
      const res  = await fetch('/api/admin/process-scoutradioz-configs', { method: 'POST' })
      setRunResult(await res.json())
    } catch {
      setRunResult({ error: 'Network error' })
    } finally {
      setRunning(false)
    }
  }

  async function handleRunSingle(id: string) {
    setRunningId(id)
    setSingleRunResults(prev => ({ ...prev, [id]: undefined! }))
    try {
      const res  = await fetch(`/api/admin/scoutradioz-config/${id}/run`, { method: 'POST' })
      const json = await res.json()
      setSingleRunResults(prev => ({ ...prev, [id]: json }))
    } catch {
      setSingleRunResults(prev => ({ ...prev, [id]: { error: 'Network error' } }))
    } finally {
      setRunningId(null)
    }
  }

  const mappedFields = editConfig.mappings.filter(m => m.strategy).map(m => m.outputField)

  return (
    <div>
      <datalist id={DATALIST_ID}>
        {sourceFields.map(f => <option key={f} value={f} />)}
      </datalist>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">ScoutRadioz Configuration</h2>
        {view === 'list' && (
          <button onClick={handleNewConfig} className={btnPrimary}>+ New Config</button>
        )}
      </div>

      {/* ── List view ──────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <div className="space-y-2">
          {configs.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">No configs yet. Click + New Config to create one.</p>
          ) : (
            configs.map(c => (
              <ConfigListRow
                key={c._id}
                config={c}
                onEdit={() => handleEditConfig(c)}
                onDelete={() => handleDeleteConfig(c._id!)}
                onRun={() => handleRunSingle(c._id!)}
                running={runningId === c._id}
                runResult={singleRunResults[c._id!] ?? null}
              />
            ))
          )}

          {/* Run all */}
          {configs.length > 0 && (
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleRunAll}
                disabled={running}
                className="h-10 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {running ? 'Processing…' : 'Run All Configs'}
              </button>
              {runResult && (
                <p className={`text-sm ${runResult.error ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {runResult.error ? `Error: ${runResult.error}` : runResult.message}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Edit view ──────────────────────────────────────────────────────── */}
      {view === 'edit' && (
        <div className="space-y-6">
          {/* Scope */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Config Scope</p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Name</label>
                <input
                  className={`${inputCls} h-9 w-48`}
                  value={editConfig.name}
                  onChange={e => updateScope('name', e.target.value)}
                  placeholder="Config name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Season</label>
                <select
                  className={`${selectCls} h-9 w-28`}
                  value={editConfig.season}
                  onChange={e => updateScope('season', parseInt(e.target.value, 10))}
                >
                  {seasons.map(s => <option key={s} value={s}>{s}</option>)}
                  {!seasons.includes(editConfig.season) && (
                    <option value={editConfig.season}>{editConfig.season}</option>
                  )}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Event Code</label>
                <select
                  className={`${selectCls} h-9 w-36`}
                  value={editConfig.eventCode}
                  onChange={e => updateScope('eventCode', e.target.value)}
                >
                  <option value="">All events</option>
                  {eventCodes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Org</label>
                <select
                  className={`${selectCls} h-9 w-36`}
                  value={editConfig.org_key}
                  onChange={e => updateScope('org_key', e.target.value)}
                >
                  <option value="">All orgs</option>
                  {orgs.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <button onClick={loadSourceFields} className={`${btnGhost} h-9`}>
                Load Source Fields
              </button>
              {sourceFields.length > 0 && (
                <span className="text-xs text-zinc-400">{sourceFields.length} fields loaded</span>
              )}
            </div>
          </div>

          {/* Mappings */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Field Mappings</p>
            <div>
              {editConfig.mappings.map((mapping, i) => (
                <FieldMappingRow
                  key={mapping.outputField}
                  mapping={mapping}
                  onChange={upd => updateMapping(i, upd)}
                  listId={DATALIST_ID}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          {previewData && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Preview</p>
              <PreviewTable
                records={previewData.records}
                total={previewData.total}
                mappedFields={mappedFields}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handlePreview}
              disabled={previewing}
              className={`${btnGhost} h-10 px-5 text-sm`}
            >
              {previewing ? 'Loading…' : 'Preview'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-10 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {saving ? 'Saving…' : 'Save Config'}
            </button>
            <button
              onClick={() => { setView('list'); setPreviewData(null); setSaveMsg(null) }}
              className={`${btnGhost} h-10 px-5 text-sm`}
            >
              ← Back
            </button>
            {saveMsg && (
              <p className={`text-sm ${saveMsg.startsWith('Error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {saveMsg}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
