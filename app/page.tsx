import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
          ReScouter
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">
          FRC scouting data platform
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/events"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-8 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Browse Events
          </Link>
          <Link
            href="/rankings"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-8 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            World Rankings
          </Link>
          <Link
            href="/game"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-8 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Mini Game
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-8 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
