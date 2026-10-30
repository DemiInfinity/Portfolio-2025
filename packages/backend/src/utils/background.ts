import { waitUntil } from '@vercel/functions'

type Runner = (task: () => Promise<void>) => void

let override: Runner | null = null

/**
 * Tests: take over background work (run it, collect it, or drop it).
 * `null` restores the default.
 */
export function setBackgroundRunner(runner: Runner | null) {
  override = runner
}

/**
 * Runs `fn` after the response without blocking it. On Vercel, `waitUntil`
 * keeps the invocation alive (up to the function's maxDuration); elsewhere it
 * is a detached promise. Errors are logged, never thrown.
 */
export function runInBackground(fn: () => Promise<unknown>): void {
  const run = () =>
    Promise.resolve()
      .then(fn)
      .then(() => undefined)
      .catch((error) => console.error('Background task failed:', error))
  if (override) {
    override(run)
    return
  }
  const task = run()
  if (process.env.VERCEL) {
    try {
      waitUntil(task)
    } catch (error) {
      console.warn('waitUntil unavailable; background task is detached', error)
    }
  }
}
