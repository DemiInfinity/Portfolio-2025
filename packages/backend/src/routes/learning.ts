import express from 'express'
import { body } from 'express-validator'
import { Request, Response } from 'express'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'
import { normaliseDate, isDateInput, isRequiredDateInput } from '../utils/dates'
import { toStringArray, parseListInput } from '../utils/lists'
import { rejectInvalid, sendInvalid, optionalText } from '../utils/validation'
import { insertRow, updateRow, selectById, selectRows, isIntId, Row } from '../utils/db'
import { markCvDirty } from '../services/cvDirty'

const router = express.Router()

export const LEARNING_STATUSES = ['not_started', 'in_progress', 'completed', 'paused']

export const COLUMNS = 'id, title, provider, description, progress, category, start_date, estimated_completion, resources, status, created_at, updated_at'
export const LEGACY_COLUMNS = 'id, title, description, progress, category, start_date, estimated_completion, resources, status, created_at, updated_at'
const NEW_COLUMNS = ['provider']

/** `provider` is null when unset, and absent only before the migration has run. */
export function formatLearning(item: Row): Row {
  return {
    ...item,
    description: item.description ?? null,
    resources: toStringArray(item.resources)
  }
}

const textField = (name: string, max: number) =>
  body(name)
    .optional({ nullable: true })
    .custom((v) => typeof v === 'string')
    .withMessage(`${name} must be text`)
    .bail()
    .isLength({ max })
    .withMessage(`${name} is at most ${max} characters`)

const validators = (isCreate: boolean) => [
  isCreate
    ? body('title').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Title is required')
    : body('title').optional().isString().trim().isLength({ min: 1, max: 255 }).withMessage('Title cannot be empty'),
  isCreate
    ? body('category').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Category is required')
    : body('category').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('Category cannot be empty'),
  isCreate
    ? body('start_date').custom(isRequiredDateInput).withMessage('Start date must be YYYY-MM or YYYY-MM-DD')
    : body('start_date').optional().custom(isRequiredDateInput).withMessage('Start date must be YYYY-MM or YYYY-MM-DD'),
  body('estimated_completion').optional({ nullable: true }).custom(isDateInput).withMessage('Target date must be YYYY-MM or YYYY-MM-DD'),
  textField('provider', 120),
  textField('description', 2000),
  body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress is a whole number from 0 to 100').toInt(),
  body('status').optional().isIn(LEARNING_STATUSES).withMessage(`Status is one of ${LEARNING_STATUSES.join(', ')}`),
  body('resources').optional({ nullable: true }).custom((v) => parseListInput(v, ',') !== null).withMessage('Resources must be a list')
]

function toPayload(input: Row): Row {
  const out: Row = {}
  if ('title' in input) out.title = String(input.title).trim()
  if ('category' in input) out.category = String(input.category).trim()
  if ('start_date' in input) out.start_date = normaliseDate(input.start_date)
  if ('estimated_completion' in input) out.estimated_completion = normaliseDate(input.estimated_completion)
  if ('provider' in input) out.provider = optionalText(input.provider)
  if ('description' in input) out.description = optionalText(input.description)
  if ('progress' in input) out.progress = Number(input.progress)
  if ('status' in input) out.status = input.status
  if ('resources' in input) out.resources = parseListInput(input.resources, ',') || []
  return out
}

/**
 * Progress and status move together: progress 100 without a status means
 * completed, and status completed without a progress means 100.
 */
export function applyProgressRules(payload: Row): Row {
  const out = { ...payload }
  if (out.progress === 100 && out.status === undefined) out.status = 'completed'
  if (out.status === 'completed' && out.progress === undefined) out.progress = 100
  return out
}

const listColumnsBy = (build: (q: any) => any) => selectRows('learning', COLUMNS, LEGACY_COLUMNS, build)

// Get all learning items (public)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await listColumnsBy((q) => q.order('created_at', { ascending: false }))
    return res.json({ success: true, data: items.map(formatLearning) })
  } catch (error) {
    console.error('Get learning error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Get learning items in the 'skills' category (public)
router.get('/skills', async (_req: Request, res: Response) => {
  try {
    const items = await listColumnsBy((q) => q.eq('category', 'skills').order('start_date', { ascending: false }))
    return res.json({ success: true, data: items.map(formatLearning) })
  } catch (error) {
    console.error('Get learning skills error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Get learning items by category (public)
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const category = String(req.params.category)
    const items = await listColumnsBy((q) => q.eq('category', category).order('start_date', { ascending: false }))
    return res.json({ success: true, data: items.map(formatLearning) })
  } catch (error) {
    console.error('Get learning by category error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Get single learning item by ID (public)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    if (!isIntId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID format' })
    }
    const item = await selectById('learning', id, COLUMNS, LEGACY_COLUMNS)
    if (!item) {
      return res.status(404).json({ success: false, error: 'Learning item not found' })
    }
    return res.json({ success: true, data: formatLearning(item) })
  } catch (error) {
    console.error('Get learning item error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Create learning item (admin only)
router.post('/', [authenticate, authorize('admin'), ...validators(true)], async (req: AuthRequest, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return

    const payload = applyProgressRules({
      progress: 0,
      ...toPayload(req.body)
    })
    payload.status = payload.status ?? (payload.progress === 100 ? 'completed' : 'in_progress')
    payload.description = payload.description ?? null
    payload.provider = payload.provider ?? null
    payload.estimated_completion = payload.estimated_completion ?? null
    payload.resources = payload.resources ?? []

    const newItem = await insertRow('learning', payload, NEW_COLUMNS)
    await markCvDirty()
    return res.status(201).json({ success: true, data: formatLearning(newItem) })
  } catch (error) {
    console.error('Create learning item error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Update learning item (admin only, partial)
router.put('/:id', [authenticate, authorize('admin'), ...validators(false)], async (req: AuthRequest, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return

    const id = String(req.params.id)
    if (!isIntId(id)) return sendInvalid(res, [{ path: 'id', msg: 'Invalid ID format' }])

    const payload = applyProgressRules(toPayload(req.body))
    payload.updated_at = new Date().toISOString()

    const updated = await updateRow('learning', id, payload, NEW_COLUMNS)
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Learning item not found' })
    }
    await markCvDirty()
    return res.json({ success: true, data: formatLearning(updated) })
  } catch (error) {
    console.error('Update learning item error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Delete learning item (admin only)
router.delete('/:id', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id)
    const { supabaseService } = getServices()

    const { data: deletedItem, error } = await supabaseService.getClient()
      .from('learning')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error || !deletedItem) {
      return res.status(404).json({ success: false, error: 'Learning item not found' })
    }

    await markCvDirty()
    return res.json({ success: true, message: 'Learning item deleted successfully' })
  } catch (error) {
    console.error('Delete learning item error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
