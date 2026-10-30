import { getServices } from '../services'
import { isMissingColumnError } from './validation'

export type Row = Record<string, any>

function without(payload: Row, keys: string[]): Row {
  const out = { ...payload }
  for (const k of keys) delete out[k]
  return out
}

/** True when a `.single()` read found no row. */
export function isNotFound(error: any): boolean {
  return Boolean(error) && (error.code === 'PGRST116' || /0 rows|no rows/i.test(String(error.message || '')))
}

/**
 * Inserts one row and returns it. If the database hasn't been migrated yet
 * and rejects one of `newColumns`, retries without them.
 */
export async function insertRow(table: string, payload: Row, newColumns: string[] = []): Promise<Row> {
  const client = getServices().supabaseService.getClient()
  let { data, error } = await client.from(table).insert(payload).select().single()
  if (error && newColumns.length && isMissingColumnError(error)) {
    ;({ data, error } = await client.from(table).insert(without(payload, newColumns)).select().single())
  }
  if (error) throw error
  return data as Row
}

/**
 * Updates the row with this id and returns it, or null when there is no such
 * row. Retries without `newColumns` on a pre-migration database.
 */
export async function updateRow(
  table: string,
  id: string | number,
  payload: Row,
  newColumns: string[] = []
): Promise<Row | null> {
  const client = getServices().supabaseService.getClient()
  let { data, error } = await client.from(table).update(payload).eq('id', id).select().single()
  if (error && newColumns.length && isMissingColumnError(error)) {
    ;({ data, error } = await client.from(table).update(without(payload, newColumns)).eq('id', id).select().single())
  }
  if (isNotFound(error)) return null
  if (error) throw error
  return data as Row
}

/** Tries each column list in turn while the database reports a missing column. */
async function withColumnFallback<T>(
  columns: string,
  legacy: string | string[] | undefined,
  run: (cols: string) => PromiseLike<{ data: T; error: any }>
): Promise<{ data: T; error: any }> {
  const lists = [columns, ...(legacy === undefined ? [] : Array.isArray(legacy) ? legacy : [legacy])]
  let result = await run(lists[0])
  for (let i = 1; i < lists.length && result.error && isMissingColumnError(result.error); i++) {
    result = await run(lists[i])
  }
  return result
}

/** Reads one row by id (null when missing), with legacy column fallbacks. */
export async function selectById(
  table: string,
  id: string | number,
  columns: string,
  legacyColumns?: string | string[],
  build: (q: any) => any = (q) => q
): Promise<Row | null> {
  const client = getServices().supabaseService.getClient()
  const { data, error } = await withColumnFallback(columns, legacyColumns, (cols) =>
    build(client.from(table).select(cols).eq('id', id)).maybeSingle()
  )
  if (error) throw error
  return (data as Row) ?? null
}

/** Lists rows with legacy column fallbacks. `build` adds filters/order. */
export async function selectRows(
  table: string,
  columns: string,
  legacyColumns: string | string[] | undefined,
  build: (q: any) => any = (q) => q
): Promise<Row[]> {
  const client = getServices().supabaseService.getClient()
  const { data, error } = await withColumnFallback(columns, legacyColumns, (cols) => build(client.from(table).select(cols)))
  if (error) throw error
  return (data as Row[]) || []
}

/** True when `id` is a positive integer string. */
export function isIntId(id: string): boolean {
  return /^\d+$/.test(id)
}
