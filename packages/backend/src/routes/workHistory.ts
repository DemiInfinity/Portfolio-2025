import express from 'express'
import { body } from 'express-validator'
import { Request, Response } from 'express'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'
import { normaliseDate, isDateInput, isRequiredDateInput } from '../utils/dates'
import { toStringArray, parseListInput } from '../utils/lists'
import { rejectInvalid, isOptionalHttpUrl, sendInvalid } from '../utils/validation'
import { insertRow, updateRow, selectById, selectRows, isIntId, Row } from '../utils/db'
import { markCvDirty } from '../services/cvDirty'

const router = express.Router()

const COLUMNS = 'id, company, position, location, start_date, end_date, description, achievements, technologies, company_url, highlights, created_at, updated_at'
const LEGACY_COLUMNS = 'id, company, position, location, start_date, end_date, description, achievements, technologies, company_url, created_at, updated_at'
const NEW_COLUMNS = ['highlights']

export const MAX_HIGHLIGHTS = 6
export const MAX_HIGHLIGHT_LENGTH = 60

/** Highlights: array or newline-separated string; each 1-60 chars, at most 6. */
export function parseHighlights(value: unknown): string[] {
  const list = parseListInput(value, '\n')
  if (list === null) throw new Error('Highlights must be a list of short lines')
  if (list.length > MAX_HIGHLIGHTS) throw new Error(`Use at most ${MAX_HIGHLIGHTS} highlights`)
  if (list.some((h) => h.length > MAX_HIGHLIGHT_LENGTH)) {
    throw new Error(`Each highlight is at most ${MAX_HIGHLIGHT_LENGTH} characters`)
  }
  return list
}

export function formatJob(job: Row): Row {
  return {
    ...job,
    location: job.location ?? '',
    description: job.description ?? '',
    company_url: job.company_url || null,
    achievements: toStringArray(job.achievements, null),
    technologies: toStringArray(job.technologies, null),
    highlights: toStringArray(job.highlights, null)
  }
}

const optionalTextField = (name: string, max: number) =>
  body(name)
    .optional({ nullable: true })
    .custom((v) => typeof v === 'string')
    .withMessage(`${name} must be text`)
    .bail()
    .isLength({ max })
    .withMessage(`${name} is at most ${max} characters`)

const listField = (name: string) =>
  body(name)
    .optional({ nullable: true })
    .custom((v) => parseListInput(v, '\n') !== null)
    .withMessage(`${name} must be a list`)

const writeValidators = (isCreate: boolean) => [
  isCreate
    ? body('company').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Company is required')
    : body('company').optional().isString().trim().isLength({ min: 1, max: 200 }).withMessage('Company cannot be empty'),
  isCreate
    ? body('position').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Position is required')
    : body('position').optional().isString().trim().isLength({ min: 1, max: 200 }).withMessage('Position cannot be empty'),
  isCreate
    ? body('start_date').custom(isRequiredDateInput).withMessage('Start date must be YYYY-MM or YYYY-MM-DD')
    : body('start_date').optional().custom(isRequiredDateInput).withMessage('Start date must be YYYY-MM or YYYY-MM-DD'),
  body('end_date').optional({ nullable: true }).custom(isDateInput).withMessage('End date must be YYYY-MM or YYYY-MM-DD'),
  optionalTextField('location', 200),
  optionalTextField('description', 5000),
  body('company_url').optional({ nullable: true }).custom(isOptionalHttpUrl).withMessage('Company URL must start with http:// or https://'),
  listField('achievements'),
  listField('technologies'),
  body('highlights').optional({ nullable: true }).custom((v) => {
    parseHighlights(v)
    return true
  })
]

/** Builds the DB payload from the validated body (only the keys that were sent). */
function toPayload(input: Row): Row {
  const out: Row = {}
  if ('company' in input) out.company = String(input.company).trim()
  if ('position' in input) out.position = String(input.position).trim()
  if ('location' in input) out.location = input.location == null ? '' : String(input.location).trim()
  if ('description' in input) out.description = input.description == null ? '' : String(input.description).trim()
  if ('start_date' in input) out.start_date = normaliseDate(input.start_date)
  if ('end_date' in input) out.end_date = normaliseDate(input.end_date)
  if ('company_url' in input) {
    const url = typeof input.company_url === 'string' ? input.company_url.trim() : ''
    out.company_url = url === '' ? null : url
  }
  if ('achievements' in input) out.achievements = parseListInput(input.achievements, '\n') || []
  if ('technologies' in input) out.technologies = parseListInput(input.technologies, ',') || []
  if ('highlights' in input) out.highlights = parseHighlights(input.highlights)
  return out
}

// Get all work history (public)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await selectRows('work_history', COLUMNS, LEGACY_COLUMNS, (q) => q.order('start_date', { ascending: false }))
    return res.json({ success: true, data: rows.map(formatJob) })
  } catch (error) {
    console.error('Get work history error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Legacy: education entries (unused; kept for compatibility)
router.get('/education', async (_req: Request, res: Response) => {
  try {
    const { supabaseService } = getServices()
    const { data: education, error } = await supabaseService.getClient()
      .from('education')
      .select('id, institution, degree, field_of_study, location, start_date, end_date, gpa, description, achievements')
      .order('start_date', { ascending: false })
    if (error) throw error
    return res.json({
      success: true,
      data: (education || []).map((edu: Row) => ({ ...edu, achievements: toStringArray(edu.achievements, null) }))
    })
  } catch (error) {
    console.error('Get education error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Legacy: work entries that look like certifications (unused; kept for compatibility)
router.get('/certifications', async (_req: Request, res: Response) => {
  try {
    const { supabaseService } = getServices()
    const { data: workHistory, error } = await supabaseService.getClient()
      .from('work_history')
      .select(LEGACY_COLUMNS)
      .or('position.ilike.%certification%,position.ilike.%certificate%,description.ilike.%certified%')
      .order('start_date', { ascending: false })
    if (error) throw error
    return res.json({ success: true, data: (workHistory || []).map(formatJob) })
  } catch (error) {
    console.error('Get certifications error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Get single work history item by ID (public)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    if (!isIntId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID format' })
    }
    const job = await selectById('work_history', id, COLUMNS, LEGACY_COLUMNS)
    if (!job) {
      return res.status(404).json({ success: false, error: 'Work history item not found' })
    }
    return res.json({ success: true, data: formatJob(job) })
  } catch (error) {
    console.error('Get work history item error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Create work history item (admin only)
router.post('/', [authenticate, authorize('admin'), ...writeValidators(true)], async (req: AuthRequest, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return

    const payload = toPayload(req.body)
    payload.location = payload.location ?? ''
    payload.description = payload.description ?? ''
    payload.end_date = payload.end_date ?? null
    payload.company_url = payload.company_url ?? null
    payload.achievements = payload.achievements ?? []
    payload.technologies = payload.technologies ?? []
    payload.highlights = payload.highlights ?? []

    const newItem = await insertRow('work_history', payload, NEW_COLUMNS)
    await markCvDirty()
    return res.status(201).json({ success: true, data: formatJob(newItem) })
  } catch (error) {
    console.error('Create work history item error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Update work history item (admin only, partial)
router.put('/:id', [authenticate, authorize('admin'), ...writeValidators(false)], async (req: AuthRequest, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return

    const id = String(req.params.id)
    if (!isIntId(id)) return sendInvalid(res, [{ path: 'id', msg: 'Invalid ID format' }])

    const payload = toPayload(req.body)
    payload.updated_at = new Date().toISOString()

    const updated = await updateRow('work_history', id, payload, NEW_COLUMNS)
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Work history item not found' })
    }
    await markCvDirty()
    return res.json({ success: true, data: formatJob(updated) })
  } catch (error) {
    console.error('Update work history item error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Delete work history item (admin only)
router.delete('/:id', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id)
    const { supabaseService } = getServices()

    const { data: deletedJob, error } = await supabaseService.getClient()
      .from('work_history')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error || !deletedJob) {
      return res.status(404).json({ success: false, error: 'Work history item not found' })
    }

    await markCvDirty()
    return res.json({ success: true, message: 'Work history item deleted successfully' })
  } catch (error) {
    console.error('Delete work history item error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
