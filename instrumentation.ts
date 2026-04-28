const INTERVAL_MS = 15 * 60 * 1000

export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  let running = false
  setInterval(async () => {
    if (running) return
    running = true
    try {
      const { syncActiveEvents } = await import('./lib/syncActive')
      const result = await syncActiveEvents()
      console.log('[cron] sync-active:', result)
    } catch (err) {
      console.error('[cron] sync-active error:', err)
    } finally {
      running = false
    }
  }, INTERVAL_MS)
}
