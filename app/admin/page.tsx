import SyncDashboard from './SyncDashboard'
import DataViewer from './DataViewer'

export default function AdminPage() {
  const season = process.env.Season ?? '2026'
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Data Sync
      </h1>
      <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
        Pull data from the FRC Events API and store it in MongoDB.
      </p>
      <SyncDashboard season={season} />

      <hr className="my-10 border-zinc-200 dark:border-zinc-800" />

      <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Data Explorer
      </h2>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Browse and search data stored in MongoDB.
      </p>
      <DataViewer />
    </div>
  )
}
