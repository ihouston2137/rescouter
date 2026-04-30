'use client'

import { useState } from 'react'

type Result = { message?: string; error?: string }

const TASKS = [
  {
    id: 'rankings',
    label: 'Active Rankings',
    description: 'Sync rankings for all currently active events.',
    endpoint: '/api/admin/run-scheduled/rankings',
  },
  {
    id: 'matches',
    label: 'Active Matches',
    description: 'Sync match results for all currently active events.',
    endpoint: '/api/admin/run-scheduled/matches',
  },
  {
    id: 'summaries',
    label: 'Alliance Summaries',
    description: 'Generate adjusted alliance score summaries for all currently active events.',
    endpoint: '/api/admin/run-scheduled/summaries',
  },
  {
    id: 'schedules',
    label: 'This Week\'s Schedules',
    description: 'Sync match schedules for all events overlapping the current calendar week.',
    endpoint: '/api/admin/run-scheduled/schedules',
  },
] as const

type TaskId = (typeof TASKS)[number]['id']

async function runEndpoint(endpoint: string): Promise<Result> {
  try {
    const res = await fetch(endpoint, { method: 'POST' })
    return res.json()
  } catch {
    return { error: 'Network error' }
  }
}

export default function ScheduleDashboard() {
  const [allLoading, setAllLoading] = useState(false)
  const [allResult,  setAllResult]  = useState<Result | null>(null)
  const [taskLoading, setTaskLoading] = useState<Partial<Record<TaskId, boolean>>>({})
  const [taskResults, setTaskResults] = useState<Partial<Record<TaskId, Result>>>({})

  async function runAll() {
    setAllLoading(true)
    setAllResult(null)
    const result = await runEndpoint('/api/admin/run-scheduled')
    setAllResult(result)
    setAllLoading(false)
  }

  async function runTask(id: TaskId, endpoint: string) {
    setTaskLoading(prev => ({ ...prev, [id]: true }))
    setTaskResults(prev => ({ ...prev, [id]: undefined }))
    const result = await runEndpoint(endpoint)
    setTaskResults(prev => ({ ...prev, [id]: result }))
    setTaskLoading(prev => ({ ...prev, [id]: false }))
  }

  return (
    <div className="space-y-8">
      {/* Run All */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Run All Scheduled Tasks</h2>
        <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
          Runs all four tasks in parallel — the same work performed automatically every 15 minutes.
        </p>
        <button
          onClick={runAll}
          disabled={allLoading}
          className="h-11 rounded-lg bg-zinc-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {allLoading ? 'Running…' : 'Run All Now'}
        </button>
        {allResult && (
          <p className={`mt-4 text-sm ${allResult.error ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {allResult.error ? `Error: ${allResult.error}` : allResult.message}
          </p>
        )}
      </div>

      {/* Individual tasks */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-zinc-700 dark:text-zinc-300">Individual Tasks</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TASKS.map(task => {
            const loading = taskLoading[task.id] ?? false
            const result  = taskResults[task.id] ?? null
            return (
              <div
                key={task.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{task.label}</h3>
                <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">{task.description}</p>
                <button
                  onClick={() => runTask(task.id, task.endpoint)}
                  disabled={loading}
                  className="h-9 rounded-lg border border-zinc-300 bg-white px-4 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  {loading ? 'Running…' : 'Run'}
                </button>
                {result && (
                  <p className={`mt-3 text-xs ${result.error ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {result.error ? `Error: ${result.error}` : result.message}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
