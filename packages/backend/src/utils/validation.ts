import { Request, Response } from 'express'
import { validationResult } from 'express-validator'

export interface FieldError {
  path: string
  msg: string
}

/** Sends the shared 400 shape. */
export function sendInvalid(res: Response, details: FieldError[]) {
  return res.status(400).json({ success: false, error: 'Invalid input', details })
}

/**
 * If express-validator found errors, sends
 * `400 {success:false, error:'Invalid input', details:[{path,msg}]}` and
 * returns true.
 */
export function rejectInvalid(req: Request, res: Response): boolean {
  const errors = validationResult(req)
  if (errors.isEmpty()) return false
  sendInvalid(
    res,
    errors.array().map((e: any) => ({ path: String(e.path ?? e.param ?? ''), msg: String(e.msg) }))
  )
  return true
}

/** Optional string field: ''/null → null, otherwise trimmed and at most `max` chars. */
export function optionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

/** True when a value is '' / null / undefined or an http(s) URL. */
export function isOptionalHttpUrl(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (typeof value !== 'string') return false
  try {
    const u = new URL(value.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** PostgREST "column does not exist" (pre-migration) errors. */
export function isMissingColumnError(error: any): boolean {
  if (!error) return false
  return error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist/i.test(String(error.message || ''))
}

/**
 * Runs a select with the new columns, and if the database hasn't been
 * migrated yet (missing column), retries with the old column list.
 */
export async function selectWithFallback<T>(
  run: (columns: string) => PromiseLike<{ data: T; error: any }>,
  columns: string,
  legacyColumns: string
): Promise<{ data: T; error: any; legacy: boolean }> {
  const first = await run(columns)
  if (!isMissingColumnError(first.error)) return { ...first, legacy: false }
  const second = await run(legacyColumns)
  return { ...second, legacy: true }
}
