import express, { NextFunction } from 'express'
import { body, query } from 'express-validator'
import { Request, Response } from 'express'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'
import { anonymizeIp } from '../utils/anonymizeIp'
import { isBotUserAgent } from '../utils/bots'
import { rejectInvalid, isMissingColumnError } from '../utils/validation'
import { insertRow } from '../utils/db'
import { summariseAnalytics, summaryWindow, trackingVersionSince, PageViewRow } from '../services/analyticsSummary'

const router = express.Router()

// Track page visit (public)
/**
 * navigator.sendBeacon sends a string body as text/plain (no CORS preflight).
 * Parse it as JSON so it goes through the same validation (H-15).
 */
const parseTextJson = (req: Request, res: Response, next: NextFunction) => {
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
      req.body = parsed
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid input', details: [{ path: 'body', msg: 'Body must be JSON' }] })
    }
  }
  if (req.body === undefined) req.body = {}
  return next()
}

export const MAX_VIEW_SECONDS = 1800
const PATH_RE = /^\/\S{0,299}$/
const TITLE_SUFFIX_RE = /\s*\|\s*Demi Taylor Nimmo\s*$/i

const cleanTitle = (t: unknown) => {
  if (typeof t !== 'string') return null
  const v = t.replace(TITLE_SUFFIX_RE, '').trim()
  return v || null
}
const cleanUtm = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : null)
const capSeconds = (v: unknown) => Math.min(Math.max(0, Math.floor(Number(v) || 0)), MAX_VIEW_SECONDS)

/** Bots and preview fetchers are dropped before anything else: 204, nothing stored (H-23). */
const dropBots = (req: Request, res: Response, next: NextFunction) => {
  if (isBotUserAgent(req.headers['user-agent'])) return res.status(204).end()
  return next()
}

const optionalText = (field: string, max: number) =>
  body(field).optional({ nullable: true }).isString().withMessage(`${field} must be text`).bail()
    .isLength({ max }).withMessage(`${field} is at most ${max} characters`)

const V2_COMMON = [
  body('event').isIn(['page_view', 'view_update']).withMessage("event is 'page_view' or 'view_update'"),
  body('view_id').isUUID().withMessage('view_id must be a UUID'),
  body('session_id').isString().withMessage('session_id is required').bail().trim().isLength({ min: 1, max: 64 }).withMessage('session_id is 1-64 characters'),
  body('page_path').isString().withMessage('page_path is required').bail().matches(PATH_RE).withMessage('page_path must start with / and have no spaces (max 300)')
]
const V2_PAGE_VIEW = [
  optionalText('page_title', 500),
  optionalText('referrer', 500),
  optionalText('utm_source', 100),
  optionalText('utm_medium', 100),
  optionalText('utm_campaign', 200)
]
const V2_VIEW_UPDATE = [
  body('duration_seconds').isInt({ min: 0, max: 86400 }).withMessage('duration_seconds is a whole number from 0 to 86400').toInt()
]
const LEGACY = [
  body('page_path').isString().withMessage('page_path is required').bail().trim().isLength({ min: 1, max: 300 }).withMessage('page_path is required'),
  optionalText('page_title', 500),
  body('session_id').isString().withMessage('session_id is required').bail().trim().isLength({ min: 1, max: 255 }).withMessage('session_id is required'),
  optionalText('referrer', 500),
  body('visit_duration').optional().isInt({ min: 0, max: 86400 }).withMessage('visit_duration is a whole number from 0 to 86400').toInt()
]

/** Picks the validators for the payload version (v2 has `event`; legacy doesn't). */
const validateTrack = async (req: Request, res: Response, next: NextFunction) => {
  const b = req.body || {}
  const chains = !('event' in b)
    ? LEGACY
    : b.event === 'view_update'
      ? [...V2_COMMON, ...V2_VIEW_UPDATE]
      : b.event === 'page_view'
        ? [...V2_COMMON, ...V2_PAGE_VIEW]
        : V2_COMMON
  for (const chain of chains) await chain.run(req)
  if (rejectInvalid(req, res)) return
  return next()
}

function visitorFields(req: Request) {
  return {
    user_agent: String(req.headers['user-agent'] || '').slice(0, 1000),
    // Anonymised before it ever reaches storage (last IPv4 octet / last 80 bits of IPv6).
    ip_address: anonymizeIp(req.ip || req.socket?.remoteAddress || '127.0.0.1')
  }
}

async function trackPageViewV2(req: Request, res: Response) {
  const b = req.body
  const client = getServices().supabaseService.getClient()

  const { data: existing, error: lookupError } = await client.from('analytics').select('id').eq('view_id', b.view_id).limit(1)
  const migrated = !isMissingColumnError(lookupError)
  if (lookupError && migrated) throw lookupError
  if (migrated && Array.isArray(existing) && existing.length) {
    return res.status(200).json({ success: true, duplicate: true })
  }

  const row = {
    event_type: 'page_view',
    view_id: b.view_id,
    session_id: String(b.session_id).trim(),
    page_path: b.page_path,
    page_title: cleanTitle(b.page_title),
    referrer: typeof b.referrer === 'string' && b.referrer.trim() ? b.referrer.trim() : null,
    utm_source: cleanUtm(b.utm_source),
    utm_medium: cleanUtm(b.utm_medium),
    utm_campaign: cleanUtm(b.utm_campaign),
    visit_duration: 0,
    ...visitorFields(req)
  }
  try {
    await insertRow('analytics', row, ['view_id', 'utm_source', 'utm_medium', 'utm_campaign', 'page_title'])
  } catch (error: any) {
    // Two sends of the same view racing: the unique index keeps one row.
    if (error?.code === '23505') return res.status(200).json({ success: true, duplicate: true })
    throw error
  }
  return res.status(201).json({ success: true })
}

async function trackViewUpdateV2(req: Request, res: Response) {
  const b = req.body
  const seconds = capSeconds(b.duration_seconds)
  const client = getServices().supabaseService.getClient()

  let { data, error } = await client.from('analytics').select('id, visit_duration').eq('view_id', b.view_id).limit(1)
  if (error && isMissingColumnError(error)) {
    // Before the migration: the legacy match (latest row for this session and path).
    ;({ data, error } = await client.from('analytics').select('id, visit_duration')
      .eq('session_id', String(b.session_id).trim()).eq('page_path', b.page_path)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1))
  }
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : null
  if (!row) return res.status(202).json({ success: true, ignored: true })

  if (seconds > (Number(row.visit_duration) || 0)) {
    const { error: updateError } = await client.from('analytics')
      .update({ visit_duration: seconds, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (updateError) throw updateError
  }
  return res.status(200).json({ success: true })
}

/** Deprecated payload (no `event`), kept for a deploy or two after H-23. */
async function trackLegacy(req: Request, res: Response) {
  const { page_path, page_title, session_id, referrer } = req.body
  const visit_duration = capSeconds(req.body.visit_duration)
  const client = getServices().supabaseService.getClient()

  const { data: matches, error: lookupError } = await client.from('analytics').select('id, visit_duration')
    .eq('session_id', session_id).eq('page_path', page_path)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1)
  if (lookupError) throw lookupError
  const existing = Array.isArray(matches) ? matches[0] : null

  if (visit_duration > 0) {
    // A duration never creates a page view (audit L1).
    if (!existing) return res.status(202).json({ success: true, ignored: true })
    const update: Record<string, any> = { visit_duration, updated_at: new Date().toISOString() }
    const title = cleanTitle(page_title)
    if (title) update.page_title = title
    const { error } = await client.from('analytics').update(update).eq('id', existing.id)
    if (error) throw error
  } else {
    await insertRow('analytics', {
      event_type: 'page_view',
      session_id,
      page_path,
      page_title: cleanTitle(page_title),
      referrer: referrer || null,
      visit_duration: 0,
      ...visitorFields(req)
    }, ['page_title'])
  }
  return res.json({ success: true, message: 'Visit tracked successfully' })
}

// Track a page view or a time update (public; H-15, H-23)
router.post('/track', [
  express.text({ type: 'text/plain', limit: '16kb' }),
  dropBots,
  parseTextJson,
  validateTrack
], async (req: Request, res: Response) => {
  try {
    if (!('event' in req.body)) return await trackLegacy(req, res)
    if (req.body.event === 'view_update') return await trackViewUpdateV2(req, res)
    return await trackPageViewV2(req, res)
  } catch (error) {
    console.error('Track analytics error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})


const SUMMARY_COLUMNS = 'id, session_id, page_path, page_title, referrer, visit_duration, user_agent, utm_source, utm_medium, utm_campaign, created_at'
const SUMMARY_V1 = 'id, session_id, page_path, page_title, referrer, visit_duration, user_agent, created_at'
const SUMMARY_LEGACY = 'id, session_id, page_path, referrer, visit_duration, user_agent, created_at'
const PAGE_SIZE = 1000

/** Reads every page_view row in the window, 1000 at a time. */
async function readWindow(fromIso: string, toExclusiveIso: string): Promise<PageViewRow[]> {
  const client = getServices().supabaseService.getClient()
  const rows: PageViewRow[] = []
  const lists = [SUMMARY_COLUMNS, SUMMARY_V1, SUMMARY_LEGACY]
  let li = 0
  // Page until an empty page (not a short one), so a PostgREST max-rows
  // setting below 1000 can't silently truncate the summary (audit L6).
  for (let offset = 0; ; ) {
    const run = (cols: string) =>
      client
        .from('analytics')
        .select(cols)
        .eq('event_type', 'page_view')
        .gte('created_at', fromIso)
        .lt('created_at', toExclusiveIso)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)
    let { data, error } = await run(lists[li])
    while (error && li < lists.length - 1 && isMissingColumnError(error)) {
      li++
      ;({ data, error } = await run(lists[li]))
    }
    if (error) throw error
    const page = (data || []) as unknown as PageViewRow[]
    if (page.length === 0) return rows
    rows.push(...page)
    offset += page.length
  }
}

// Last N days summary for the admin Analytics page (H-1)
router.get('/summary', [
  authenticate,
  authorize('admin'),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('days is a whole number from 1 to 365').toInt()
], async (req: AuthRequest, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return
    const days = req.query.days ? Number(req.query.days) : 30
    const now = new Date()
    const win = summaryWindow(days, now)
    const rows = await readWindow(win.fromIso, win.toExclusiveIso)
    return res.json({ success: true, data: { ...summariseAnalytics(rows, days, now), trackingVersionSince: trackingVersionSince() } })
  } catch (error) {
    console.error('Get analytics summary error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Deprecated: replaced by /summary (H-1). Kept until the admin confirms the switch.
// Get analytics overview (admin only)
router.get('/overview', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const { supabaseService } = getServices()
    
    // Get total visits
    const { data: totalVisitsData, error: totalError } = await supabaseService.getClient()
      .from('analytics')
      .select('*', { count: 'exact', head: true })
    if (totalError) throw totalError
    const totalVisits = { count: totalVisitsData || 0 }
    
    // Get unique visitors (by session_id) - simplified for now
    const totalVisitsCount = typeof totalVisitsData === 'number' ? totalVisitsData : 0
    const uniqueVisitors = { count: Math.floor(totalVisitsCount * 0.7) } // Estimate
    
    // Get page views by path - simplified for now
    const { data: pageViewsData, error: pageViewsError } = await supabaseService.getClient()
      .from('analytics')
      .select('page_path, visit_duration')
    
    if (pageViewsError) throw pageViewsError
    
    // Group by page_path manually
    const pageViews = pageViewsData?.reduce((acc: any[], item: any) => {
      const existing = acc.find(p => p.page_path === item.page_path)
      if (existing) {
        existing.views += 1
        existing.total_duration += item.visit_duration || 0
      } else {
        acc.push({
          page_path: item.page_path,
          views: 1,
          total_duration: item.visit_duration || 0
        })
      }
      return acc
    }, []).map((item: any) => ({
      ...item,
      avg_duration: item.views > 0 ? item.total_duration / item.views : 0
    })).sort((a: any, b: any) => b.views - a.views) || []
    
    // Get daily visits - simplified to last 7 days for now
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setTime(sevenDaysAgo.getTime() - (7 * 24 * 60 * 60 * 1000))
    
    const { data: dailyVisitsData, error: dailyError } = await supabaseService.getClient()
      .from('analytics')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
    
    if (dailyError) throw dailyError
    
    // Group by date manually
    const dailyVisits = dailyVisitsData?.reduce((acc: any[], item: any) => {
      const date = new Date(item.created_at).toISOString().split('T')[0]
      const existing = acc.find(d => d.date === date)
      if (existing) {
        existing.visits += 1
      } else {
        acc.push({ date, visits: 1 })
      }
      return acc
    }, []).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()) || []
    
    // Get top referrers - simplified
    const { data: referrersData, error: referrersError } = await supabaseService.getClient()
      .from('analytics')
      .select('referrer')
      .not('referrer', 'is', null)
      .neq('referrer', '')
    
    if (referrersError) throw referrersError
    
    // Group by referrer manually
    const topReferrers = referrersData?.reduce((acc: any[], item: any) => {
      const existing = acc.find(r => r.referrer === item.referrer)
      if (existing) {
        existing.visits += 1
      } else {
        acc.push({ referrer: item.referrer, visits: 1 })
      }
      return acc
    }, []).sort((a: any, b: any) => b.visits - a.visits).slice(0, 10) || []

    return res.json({
      success: true,
      data: {
        totalVisits: totalVisits.count,
        uniqueVisitors: uniqueVisitors.count,
        pageViews: pageViews.map((pv: any) => ({
          ...pv,
          views: parseInt(pv.views),
          avg_duration: pv.avg_duration ? Math.round(parseFloat(pv.avg_duration)) : 0
        })),
        dailyVisits: dailyVisits.map((dv: any) => ({
          ...dv,
          visits: parseInt(dv.visits)
        })),
        topReferrers: topReferrers.map((tr: any) => ({
          ...tr,
          visits: parseInt(tr.visits)
        }))
      }
    })
  } catch (error) {
    console.error('Get analytics overview error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Get detailed analytics (admin only)
router.get('/detailed', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit = 50, page_path, date_from, date_to } = req.query
    const offset = page ? (parseInt(page as string) - 1) * parseInt(limit as string) : 0

    const { supabaseService } = getServices()
    
    // Build query with filters
    let query = supabaseService.getClient()
      .from('analytics')
      .select('id, page_path, user_agent, ip_address, referrer, session_id, visit_duration, created_at')

    // Add filters
    if (page_path) {
      query = query.eq('page_path', page_path as string)
    }

    if (date_from) {
      query = query.gte('created_at', date_from as string)
    }

    if (date_to) {
      query = query.lte('created_at', date_to as string)
    }

    // Add ordering and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit as string) - 1)

    const { data: analytics, error, count } = await query

    if (error) throw error

    // Get total count for pagination
    let countQuery = supabaseService.getClient()
      .from('analytics')
      .select('*', { count: 'exact', head: true })

    // Apply same filters for count
    if (page_path) {
      countQuery = countQuery.eq('page_path', page_path as string)
    }

    if (date_from) {
      countQuery = countQuery.gte('created_at', date_from as string)
    }

    if (date_to) {
      countQuery = countQuery.lte('created_at', date_to as string)
    }

    const { count: totalCount, error: countError } = await countQuery
    if (countError) throw countError

    return res.json({
      success: true,
      data: {
        analytics: analytics || [],
        pagination: {
          total: totalCount || 0,
          page: page ? parseInt(page as string) : 1,
          limit: parseInt(limit as string),
          totalPages: Math.ceil((totalCount || 0) / parseInt(limit as string))
        }
      }
    })
  } catch (error) {
    console.error('Get detailed analytics error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

export default router
