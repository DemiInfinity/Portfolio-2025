import express, { Request, Response } from 'express'
import { getServices } from '../services'
import { purgeOldAnalytics, purgeOldContactMessages } from '../services/analyticsRetention'

const router = express.Router()

// Keep-alive endpoint to prevent database from sleeping
// This endpoint performs a simple query to keep the Supabase database active
router.get('/', async (req: Request, res: Response) => {
  console.log('Keep-alive endpoint called at:', new Date().toISOString())
  try {
    const { supabaseService } = getServices()
    
    // Perform a simple query to keep the database active
    // Query a lightweight table (blog_posts count is efficient)
    const { data, error } = await supabaseService.getClient()
      .from('blog_posts')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Keep-alive query error:', error)
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      })
    }

    // 12-month retention for analytics and Hire me messages (privacy notice,
    // D-10). Runs on every keep-alive ping (GitHub Actions, every 3 days);
    // failures are logged, never thrown.
    const purge = await purgeOldAnalytics()
    const contactPurge = await purgeOldContactMessages()

    return res.json({
      success: true,
      message: 'Database keep-alive successful',
      analytics_purged: 'deleted' in purge ? purge.deleted : null,
      contact_purged: 'deleted' in contactPurge ? contactPurge.deleted : null,
      timestamp: new Date().toISOString(),
      database: 'active'
    })
  } catch (error) {
    console.error('Keep-alive error:', error)
    return res.status(500).json({
      success: false,
      error: 'Keep-alive failed',
      timestamp: new Date().toISOString()
    })
  }
})

export default router

