import express, { Request, Response } from 'express'
import { buildCvData } from '../services/cvData'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getBuildRow, toStatus, kickIfOverdue, regenerateNow, CvBuildBusyError } from '../services/cvBuild'

const router = express.Router()

// CV aggregate (public). Same data the PDF is drawn from.
router.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await buildCvData()
    res.set('Cache-Control', 'public, max-age=300')
    return res.json({ success: true, data })
  } catch (error) {
    console.error('Get CV error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PDF build status (admin). Also restarts an overdue build (safety net).
router.get('/status', [authenticate, authorize('admin')], async (_req: AuthRequest, res: Response) => {
  try {
    const row = await getBuildRow()
    kickIfOverdue(row)
    return res.json({ success: true, data: toStatus(row) })
  } catch (error) {
    console.error('Get CV status error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Rebuild the PDF now (admin): no debounce, no unchanged-content shortcut.
router.post('/regenerate', [authenticate, authorize('admin')], async (_req: AuthRequest, res: Response) => {
  try {
    const row = await regenerateNow()
    const status = toStatus(row)
    if (status.state === 'failed') {
      return res.status(500).json({ success: false, error: 'CV build failed', data: status })
    }
    return res.json({ success: true, data: status })
  } catch (error) {
    if (error instanceof CvBuildBusyError) {
      let status = null
      try {
        status = toStatus(await getBuildRow())
      } catch {
        // status stays null
      }
      return res.status(409).json({ success: false, error: 'A CV build is already running', data: status })
    }
    console.error('Regenerate CV error:', error)
    let status = null
    try {
      status = toStatus(await getBuildRow())
    } catch {
      // status stays null
    }
    return res.status(500).json({ success: false, error: 'CV build failed', data: status })
  }
})

export default router
