import { getServices } from '.'
import { buildCvData } from './cvData'
import { renderCvPdf, cvContentHash, CV_FILE_NAME } from './cvPdf'
import { isMissingTableError } from './siteContent'
import { runInBackground } from '../utils/background'

/**
 * CV PDF build pipeline (H-21 / D-8).
 *
 * - Every CV-content write calls `markCvDirty()`: row 1 of `cv_build` becomes
 *   `pending` with a new `requested_at`, and a background task waits
 *   CV_DEBOUNCE_MS (8 s) and builds only if no newer edit arrived since.
 * - A conditional update ("claim") makes sure one instance builds per burst.
 * - Unchanged content (same hash) skips the upload.
 * - `kickIfOverdue()` (called by GET /cv/status and GET /upload/resume)
 *   restarts builds lost when a background task was cut off.
 */

export const CV_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-media'
const PREFIX = (process.env.SUPABASE_STORAGE_PREFIX || 'site').replace(/^\/+|\/+$/g, '')
export const CV_PDF_DIR = `${PREFIX}/cv`
export const CV_PDF_PATH = `${CV_PDF_DIR}/${CV_FILE_NAME}`

export const PENDING_OVERDUE_MS = 60_000
export const BUILD_STALE_MS = 120_000

export type CvBuildState = 'idle' | 'pending' | 'building' | 'failed'

export interface CvBuildRow {
  id: number
  state: CvBuildState
  requested_at: string | null
  started_at: string | null
  generated_at: string | null
  content_hash: string | null
  pdf_path: string | null
  size_bytes: number | null
  error: string | null
  updated_at?: string | null
}

export interface CvStatus {
  state: CvBuildState
  generatedAt: string | null
  requestedAt: string | null
  startedAt: string | null
  error: string | null
  pdfUrl: string | null
  size: number | null
}

export class CvBuildBusyError extends Error {
  constructor() {
    super('A CV build is already running')
  }
}

export function debounceMs(): number {
  const v = parseInt(process.env.CV_DEBOUNCE_MS || '', 10)
  return Number.isFinite(v) && v >= 0 ? v : 8000
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const iso = (v: string | null | undefined) => (v ? new Date(v).toISOString() : null)
const ms = (v: string | null | undefined) => (v ? Date.parse(v) : NaN)
const client = () => getServices().supabaseService.getClient()

export async function getBuildRow(): Promise<CvBuildRow | null> {
  const { data, error } = await client().from('cv_build').select('*').eq('id', 1).maybeSingle()
  if (error) {
    if (isMissingTableError(error)) return null
    throw error
  }
  return (data as CvBuildRow) ?? null
}

async function updateRow(patch: Partial<CvBuildRow>) {
  const { error } = await client().from('cv_build').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1)
  if (error) throw error
}

export function publicPdfUrl(row: CvBuildRow | null): string | null {
  if (!row?.generated_at || !row.pdf_path) return null
  const { data } = client().storage.from(CV_BUCKET).getPublicUrl(row.pdf_path)
  return data?.publicUrl ? `${data.publicUrl}?v=${Date.parse(row.generated_at)}` : null
}

export function toStatus(row: CvBuildRow | null): CvStatus {
  return {
    state: row?.state ?? 'idle',
    generatedAt: iso(row?.generated_at),
    requestedAt: iso(row?.requested_at),
    startedAt: iso(row?.started_at),
    error: row?.error ?? null,
    pdfUrl: publicPdfUrl(row),
    size: row?.size_bytes ?? null
  }
}

/**
 * Marks the CV for rebuild and schedules a debounced build. Never throws into
 * the request: failures (e.g. migration not run) are logged.
 */
export async function markCvDirty(): Promise<void> {
  try {
    const requestedAt = new Date().toISOString()
    const patch = { state: 'pending', requested_at: requestedAt, updated_at: requestedAt }
    const { data, error } = await client().from('cv_build').update(patch).eq('id', 1).select('id')
    if (error) throw error
    if (!Array.isArray(data) || data.length === 0) {
      // Row 1 missing (the migration seeds it): create it.
      const { error: insertError } = await client().from('cv_build').upsert({ id: 1, ...patch }, { onConflict: 'id' })
      if (insertError) throw insertError
    }
    runInBackground(() => debouncedBuild(requestedAt))
  } catch (error) {
    console.warn('CV rebuild not scheduled:', error instanceof Error ? error.message : (error as any)?.message || error)
  }
}

/** Waits the debounce, then builds if this request is still the latest. */
export async function debouncedBuild(myRequestedAt: string): Promise<void> {
  await sleep(debounceMs())
  const row = await getBuildRow()
  if (!row || row.state !== 'pending' || ms(row.requested_at) !== ms(myRequestedAt)) return
  if (!(await claim(row))) return
  await runBuild(row.requested_at, false)
}

/** Conditional update to `building`; false when another instance got there first. */
async function claim(row: CvBuildRow): Promise<boolean> {
  let q = client()
    .from('cv_build')
    .update({ state: 'building', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', 1)
    .eq('state', row.state)
  if (row.state === 'pending' && row.requested_at) q = q.eq('requested_at', row.requested_at)
  if (row.state === 'building' && row.started_at) q = q.eq('started_at', row.started_at)
  const { data, error } = await q.select('id')
  if (error) throw error
  return Array.isArray(data) && data.length > 0
}

/**
 * Builds and uploads (holding the claim). `force` skips the unchanged-hash
 * shortcut. Records idle/failed; if content changed during the build, goes
 * back to pending and schedules another debounced build.
 */
async function runBuild(claimedRequestedAt: string | null, force: boolean): Promise<CvBuildRow> {
  try {
    const before = await getBuildRow()
    const cv = await buildCvData()
    const hash = cvContentHash(cv)

    let patch: Partial<CvBuildRow>
    if (!force && before?.content_hash === hash && before.pdf_path && before.generated_at) {
      patch = { error: null }
    } else {
      const pdf = await renderCvPdf(cv)
      const { error } = await client().storage.from(CV_BUCKET).upload(CV_PDF_PATH, pdf, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '300'
      })
      if (error) throw new Error(error.message || 'Storage upload failed')
      patch = {
        generated_at: new Date().toISOString(),
        content_hash: hash,
        size_bytes: pdf.length,
        pdf_path: CV_PDF_PATH,
        error: null
      }
    }

    const latest = await getBuildRow()
    const newerEdit = latest?.requested_at && claimedRequestedAt && ms(latest.requested_at) > ms(claimedRequestedAt)
    await updateRow({ ...patch, state: newerEdit ? 'pending' : 'idle' })
    if (newerEdit && latest?.requested_at) {
      const next = latest.requested_at
      runInBackground(() => debouncedBuild(next))
    }
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 500)
    console.error('CV build failed:', message)
    try {
      await updateRow({ state: 'failed', error: message })
    } catch (recordError) {
      console.error('Could not record CV build failure:', recordError)
    }
  }
  return (await getBuildRow()) as CvBuildRow
}

/** Safety net: restart a build that has been pending or locked too long. */
export function kickIfOverdue(row: CvBuildRow | null, now: number = Date.now()): boolean {
  if (!row) return false
  const overduePending = row.state === 'pending' && now - ms(row.requested_at) > PENDING_OVERDUE_MS
  const staleBuild = row.state === 'building' && now - ms(row.started_at) > BUILD_STALE_MS
  if (!overduePending && !staleBuild) return false
  runInBackground(async () => {
    if (await claim(row)) await runBuild(row.requested_at, false)
  })
  return true
}

/** POST /cv/regenerate: build now, skipping the debounce and the hash check. */
export async function regenerateNow(now: number = Date.now()): Promise<CvBuildRow> {
  let row = await getBuildRow()
  if (!row) {
    const { error } = await client().from('cv_build').upsert({ id: 1, state: 'idle' }, { onConflict: 'id' })
    if (error) throw error
    row = await getBuildRow()
    if (!row) throw new Error('cv_build row missing')
  }
  if (row.state === 'building' && now - ms(row.started_at) <= BUILD_STALE_MS) throw new CvBuildBusyError()
  if (!(await claim(row))) throw new CvBuildBusyError()
  return runBuild(row.requested_at, true)
}
