import { ApiUnavailableError } from './api'

export type Loaded<T> = { ok: true; data: T } | { ok: false; reference: string }

/** Short reference shown on the error view and written to the server log, so a reported "ERR …" can be matched. */
function newReference(): string {
  return Math.random().toString(16).slice(2, 9).padEnd(7, '0')
}

/**
 * Runs a data load and turns "the API is unavailable" into a value instead of
 * a thrown error, so the page can render its own error view during the server
 * render (QA N-8). Anything else (bugs, Next control flow) still throws.
 */
export async function loadOrUnavailable<T>(load: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await load() }
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      const reference = newReference()
      console.error(`[ERR ${reference}]`, error)
      return { ok: false, reference }
    }
    throw error
  }
}
