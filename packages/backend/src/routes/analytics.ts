import express from 'express'
import { body, validationResult } from 'express-validator'
import { Request, Response } from 'express'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'
import { anonymizeIp } from '../utils/anonymizeIp'

const router = express.Router()

// Track page visit (public)
router.post('/track', [
  body('page_path').isLength({ min: 1 }).trim(),
  body('page_title').optional().isLength({ min: 1 }).trim(),
  body('session_id').isLength({ min: 1 }).trim(),
  body('referrer').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true
    return /^https?:\/\/.+/.test(value) || /^[a-zA-Z0-9.-]+/.test(value)
  }),
  body('visit_duration').optional().isInt({ min: 0 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: errors.array()
      })
    }

    const {
      page_path,
      page_title,
      session_id,
      referrer,
      visit_duration = 0
    } = req.body

    const user_agent = req.headers['user-agent'] || ''
    // Anonymize before it ever reaches storage: GDPR-relevant for a UK/EU-facing
    // public endpoint. Zeroes the last IPv4 octet / last 80 bits of IPv6, which
    // is enough for coarse geo aggregation without identifying an individual.
    const rawIp = req.ip || req.connection.remoteAddress || '127.0.0.1'
    const ip_address = anonymizeIp(rawIp)

    const { supabaseService } = getServices()
    
    // Check if this is an update to existing session visit
    const { data: existingVisit, error: visitError } = await supabaseService.getClient()
      .from('analytics')
      .select('id')
      .eq('session_id', session_id)
      .eq('page_path', page_path)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    // Handle case where no existing visit is found (not an error)
    const hasExistingVisit = !visitError && existingVisit

    if (hasExistingVisit && visit_duration > 0) {
      // Update existing visit with duration
      await supabaseService.update('analytics', existingVisit.id, {
        visit_duration,
        updated_at: new Date().toISOString()
      })
    } else {
      // Insert new visit (add required event_type field)
      await supabaseService.insert('analytics', {
        session_id,
        page_path,
        user_agent,
        ip_address,
        referrer,
        visit_duration,
        event_type: 'page_view' // Required field
      })
    }

    return res.json({
      success: true,
      message: 'Visit tracked successfully'
    })
  } catch (error) {
    console.error('Track analytics error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

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
