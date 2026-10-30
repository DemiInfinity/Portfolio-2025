import express, { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { body, query } from 'express-validator'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'
import { anonymizeIp } from '../utils/anonymizeIp'
import { rejectInvalid } from '../utils/validation'
import { selectRows, updateRow, isIntId, Row } from '../utils/db'
import { sendContactEmail } from '../services/mailer'

export const CONTACT_KINDS = ['role', 'freelance', 'hi']
export const CONTACT_STATUSES = ['new', 'read', 'archived']
const COLUMNS = 'id, kind, name, email, message, source_path, status, email_status, created_at'
const LEGACY_COLUMNS = 'id, kind, name, email, message, source_path, status, created_at'

const validators = [
  body('kind').isIn(CONTACT_KINDS).withMessage('Choose what you are getting in touch about'),
  body('name').optional({ nullable: true }).custom((v) => typeof v === 'string').withMessage('Name must be text')
    .bail().trim().isLength({ max: 120 }).withMessage('Name is at most 120 characters'),
  body('email').isString().withMessage('Enter your email').bail().trim()
    .isLength({ max: 254 }).withMessage('Email is too long').bail()
    .isEmail().withMessage('Enter a valid email address'),
  body('message').isString().withMessage('Write a message').bail().trim()
    .isLength({ min: 1, max: 5000 }).withMessage('Write a message of up to 5000 characters'),
  body('source_path').optional({ nullable: true }).custom((v) => typeof v === 'string' && v.length <= 300).withMessage('Invalid page')
]

/** Any value other than '', whitespace, null or undefined counts as filled (bots may send true, 1, arrays). */
export function honeypotFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  return true
}

/** Builds the router; each call has its own rate-limit store (tests make fresh ones). */
export function createContactRouter() {
  const router = express.Router()

  const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ success: false, error: 'Too many messages. Please try again later.' })
    }
  })

  // Hire me form (public)
  router.post('/', limiter, validators, async (req: Request, res: Response) => {
    try {
      // Honeypot: bots fill the hidden field. Pretend it worked; store and send nothing.
      if (honeypotFilled(req.body?.website)) {
        return res.status(200).json({ success: true })
      }
      if (rejectInvalid(req, res)) return

      const row = {
        kind: req.body.kind,
        name: typeof req.body.name === 'string' ? req.body.name : '',
        email: String(req.body.email),
        message: String(req.body.message),
        source_path: typeof req.body.source_path === 'string' && req.body.source_path ? req.body.source_path : null,
        ip_address: anonymizeIp(req.ip || req.socket?.remoteAddress || ''),
        user_agent: String(req.headers['user-agent'] || '').slice(0, 1000),
        status: 'new'
      }

      const client = getServices().supabaseService.getClient()
      const { data: saved, error } = await client.from('contact_messages').insert(row).select('id, created_at').single()
      if (error || !saved) throw error || new Error('Insert returned no row')

      const receivedAt = saved.created_at ? new Date(saved.created_at).toISOString() : new Date().toISOString()

      // Email never changes the response (H-20).
      try {
        const result = await sendContactEmail({ ...row, received_at: receivedAt })
        const update: Row = { email_status: result.status }
        if (result.status === 'failed') {
          update.email_error = result.error
          console.error('Contact email failed:', result.error)
        }
        const { error: updateError } = await client.from('contact_messages').update(update).eq('id', saved.id)
        if (updateError) console.warn('Could not record email status (run the v2 migration?):', updateError.message)
      } catch (mailError) {
        console.error('Contact email error:', mailError)
      }

      return res.status(201).json({ success: true, data: { id: saved.id, received_at: receivedAt } })
    } catch (error) {
      console.error('Contact submit error:', error)
      return res.status(500).json({ success: false, error: 'Internal server error' })
    }
  })

  // Messages (admin)
  router.get(
    '/',
    [
      authenticate,
      authorize('admin'),
      query('status').optional().isIn(CONTACT_STATUSES).withMessage('Unknown status'),
      query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit is 1 to 200').toInt()
    ],
    async (req: AuthRequest, res: Response) => {
      try {
        if (rejectInvalid(req, res)) return
        const status = req.query.status ? String(req.query.status) : null
        const limit = req.query.limit ? Number(req.query.limit) : 50
        const rows = await selectRows('contact_messages', COLUMNS, LEGACY_COLUMNS, (q) => {
          let built = q
          if (status) built = built.eq('status', status)
          return built.order('created_at', { ascending: false }).limit(limit)
        })
        return res.json({ success: true, data: rows })
      } catch (error) {
        console.error('List contact messages error:', error)
        return res.status(500).json({ success: false, error: 'Internal server error' })
      }
    }
  )

  router.put(
    '/:id',
    [authenticate, authorize('admin'), body('status').isIn(CONTACT_STATUSES).withMessage('Status is new, read or archived')],
    async (req: AuthRequest, res: Response) => {
      try {
        if (rejectInvalid(req, res)) return
        const id = String(req.params.id)
        if (!isIntId(id)) return res.status(404).json({ success: false, error: 'Message not found' })
        const updated = await updateRow('contact_messages', id, { status: req.body.status })
        if (!updated) return res.status(404).json({ success: false, error: 'Message not found' })
        return res.json({ success: true, data: updated })
      } catch (error) {
        console.error('Update contact message error:', error)
        return res.status(500).json({ success: false, error: 'Internal server error' })
      }
    }
  )

  return router
}

export default createContactRouter()
