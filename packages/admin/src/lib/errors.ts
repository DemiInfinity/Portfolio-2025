type ErrBody = { error?: string; details?: { path?: string; msg?: string }[] }

const body = (err: unknown): ErrBody | undefined => {
  if (err && typeof err === 'object' && 'response' in err) {
    return (err as { response?: { data?: ErrBody } }).response?.data
  }
  return undefined
}

export const statusOf = (err: unknown): number | undefined =>
  err && typeof err === 'object' && 'response' in err
    ? (err as { response?: { status?: number } }).response?.status
    : undefined

/** The server's `error` text, or the fallback. */
export const apiError = (err: unknown, fallback = "Couldn't save. Try again.") => body(err)?.error || fallback

/** Map a 400 `details[]` (H-8 point 5) to `{ path: msg }`. Empty when there are none. */
export const fieldErrors = (err: unknown): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const d of body(err)?.details || []) {
    if (d.path && d.msg && !out[d.path]) out[d.path] = d.msg
  }
  return out
}
