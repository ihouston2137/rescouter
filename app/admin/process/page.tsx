import ProcessDashboard from './ProcessDashboard'

export default function ProcessPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Data Processing
      </h1>
      <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
        Run batch computations over synced data and store the results in MongoDB.
      </p>
      <ProcessDashboard />
    </div>
  )
}
