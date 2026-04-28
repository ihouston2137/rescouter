'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  type AllianceSummaryRow,
  type ScoreMode,
  type Orientation,
  SCORE_MODES,
  ToggleSwitch,
  BoxPlotChart,
  SummaryTable,
  getStatsByMode,
} from '@/components/AnalysisView'

const PAGE_SIZE = 100

export default function RankingsPage({
  summaries,
  season,
}: {
  summaries: AllianceSummaryRow[]
  season: number
}) {
  const [mode, setMode]               = useState<ScoreMode>('adjustedFinal')
  const [orientation, setOrientation] = useState<Orientation>('vertical')
  const [showTable, setShowTable]     = useState(false)
  const [page, setPage]               = useState(0)

  // Global sort by active mode's median — determines ranking
  const globalSorted = useMemo(
    () => [...summaries].sort(
      (a, b) => (getStatsByMode(b, mode).median ?? -Infinity) - (getStatsByMode(a, mode).median ?? -Infinity)
    ),
    [summaries, mode],
  )

  const totalPages = Math.ceil(globalSorted.length / PAGE_SIZE)
  const pageStart  = page * PAGE_SIZE
  const pageSummaries = globalSorted.slice(pageStart, pageStart + PAGE_SIZE)

  // Reset to page 0 when mode changes
  function handleModeChange(next: ScoreMode) {
    setMode(next)
    setPage(0)
  }

  return (
    <div>
      <Link
        href="/"
        className="mb-6 inline-block text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Home
      </Link>

      <h1 className="mb-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        World Rankings
      </h1>
      <p className="mb-8 text-sm text-zinc-400 dark:text-zinc-500">
        {season} season · {summaries.length.toLocaleString()} teams
      </p>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Score type</span>
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
            {SCORE_MODES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => handleModeChange(id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  mode === id
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!showTable && (
          <ToggleSwitch
            checked={orientation === 'vertical'}
            onChange={v => setOrientation(v ? 'vertical' : 'horizontal')}
            labelOff="Horizontal"
            labelOn="Vertical"
          />
        )}

        <ToggleSwitch
          checked={showTable}
          onChange={setShowTable}
          labelOff="Chart"
          labelOn="Table"
        />
      </div>

      {/* Content */}
      {showTable ? (
        <SummaryTable
          summaries={pageSummaries}
          mode={mode}
          rowLabel="RANK"
          rankOffset={pageStart}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <BoxPlotChart summaries={pageSummaries} mode={mode} orientation={orientation} />
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="h-9 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            ← Previous
          </button>

          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, globalSorted.length)} of {globalSorted.length.toLocaleString()}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="h-9 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
