import ScheduleDashboard from './ScheduleDashboard'

export default function SchedulePage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Scheduled Tasks
      </h1>
      <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
        These tasks run automatically every 15 minutes. Use this page to trigger them manually.
      </p>
      <ScheduleDashboard />
    </div>
  )
}
