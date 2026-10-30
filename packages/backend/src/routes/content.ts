import express, { Request, Response } from 'express'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getAbout, saveAbout, validateAbout } from '../services/siteContent'
import { sendInvalid } from '../utils/validation'
import { markCvDirty } from '../services/cvDirty'

const router = express.Router()

// About content (public): stored document over the defaults (H-16)
router.get('/about', async (_req: Request, res: Response) => {
  try {
    const { value, updated_at } = await getAbout()
    res.set('Cache-Control', 'public, max-age=60')
    return res.json({ success: true, data: { ...value, updated_at } })
  } catch (error) {
    console.error('Get about content error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// About content (admin): full replace
router.put('/about', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const { updated_at: _ignored, ...input } = (req.body || {}) as Record<string, unknown>
    const { value, errors } = validateAbout(input)
    if (!value) return sendInvalid(res, errors)
    const saved = await saveAbout(value)
    await markCvDirty()
    return res.json({ success: true, data: { ...saved.value, updated_at: saved.updated_at } })
  } catch (error) {
    console.error('Save about content error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
