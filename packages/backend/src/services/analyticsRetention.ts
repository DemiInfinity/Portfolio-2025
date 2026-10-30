import { getServices } from '.'

/**
 * 12-month retention, as the privacy notice promises:
 * - page-view analytics (`analytics`), and
 * - Hire me messages (`contact_messages`, D-10).
 * Each purge is one indexed DELETE on created_at: idempotent, cheap, and it
 * never throws (errors are logged and returned).
 */
export const ANALYTICS_RETENTION_DAYS = 365
export const CONTACT_RETENTION_DAYS = 365

export type PurgeResult = { deleted: number; cutoff: string } | { error: string; cutoff: string }

async function purgeOlderThan(table: string, label: string, days: number, now: Date): Promise<PurgeResult> {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
  try {
    const { error, count } = await getServices().supabaseService.getClient()
      .from(table)
      .delete({ count: 'exact' })
      .lt('created_at', cutoff)
    if (error) throw error
    const deleted = count ?? 0
    console.log(`${label} retention: deleted ${deleted} rows older than ${cutoff}`)
    return { deleted, cutoff }
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as any)?.message ?? error)
    console.error(`${label} retention purge failed:`, message)
    return { error: message, cutoff }
  }
}

export function purgeOldAnalytics(now: Date = new Date()): Promise<PurgeResult> {
  return purgeOlderThan('analytics', 'Analytics', ANALYTICS_RETENTION_DAYS, now)
}

export function purgeOldContactMessages(now: Date = new Date()): Promise<PurgeResult> {
  return purgeOlderThan('contact_messages', 'Contact messages', CONTACT_RETENTION_DAYS, now)
}
