'use client'

import { useState } from 'react'

type ProcessResult = { count?: number; message?: string; error?: string }

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

export default function ProcessDashboard() {
  const [allianceResult, setAllianceResult]         = useState<ProcessResult | null>(null)
  const [generatingAlliances, setGeneratingAlliances] = useState(false)

  const [latestResult, setLatestResult]           = useState<ProcessResult | null>(null)
  const [generatingLatest, setGeneratingLatest]   = useState(false)

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

  return (
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
    </div>
  )
}
