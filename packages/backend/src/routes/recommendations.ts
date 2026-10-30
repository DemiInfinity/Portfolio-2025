import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'
import { listRecommendations, formatRecommendation, RECOMMENDATION_COLUMNS } from '../services/recommendations'
import { normaliseDate, isDateInput } from '../utils/dates'
import { rejectInvalid, optionalText, isOptionalHttpUrl } from '../utils/validation'
import { insertRow, updateRow, selectById, isIntId, Row } from '../utils/db'
import { markCvDirty } from '../services/cvDirty'

const router = express.Router()

const optionalTextField = (name: string, max: number) =>
  body(name)
    .optional({ nullable: true })
    .custom((v) => typeof v === 'string')
    .withMessage(`${name} must be text`)
    .bail()
    .isLength({ max })
    .withMessage(`${name} is at most ${max} characters`)

const requiredText = (name: string, max: number, isCreate: boolean) => {
  const chain = isCreate ? body(name) : body(name).optional()
  return chain.isString().withMessage(`${name} is required`).bail().trim()
    .isLength({ min: 1, max }).withMessage(`${name} is 1 to ${max} characters`)
}

const validators = (isCreate: boolean) => [
  requiredText('quote', 600, isCreate),
  requiredText('name', 120, isCreate),
  optionalTextField('full_text', 5000),
  optionalTextField('role', 160),
  optionalTextField('company', 160),
  optionalTextField('relationship', 200),
  optionalTextField('source', 80),
  body('source_url').optional({ nullable: true }).custom(isOptionalHttpUrl).withMessage('Source URL must start with http:// or https://'),
  body('date').optional({ nullable: true }).custom(isDateInput).withMessage('Date must be YYYY-MM or YYYY-MM-DD'),
  body('show_on_cv').optional().custom((v) => typeof v === 'boolean').withMessage('show_on_cv is true or false'),
  body('sort_order').optional().isInt({ min: -100000, max: 100000 }).withMessage('sort_order is a whole number').toInt()
]

function toPayload(input: Row): Row {
  const out: Row = {}
  if ('quote' in input) out.quote = String(input.quote).trim()
  if ('name' in input) out.name = String(input.name).trim()
  for (const k of ['full_text', 'role', 'company', 'relationship', 'source', 'source_url']) {
    if (k in input) out[k] = optionalText(input[k])
  }
  if ('date' in input) out.date = normaliseDate(input.date)
  if ('show_on_cv' in input) out.show_on_cv = input.show_on_cv
  if ('sort_order' in input) out.sort_order = Number(input.sort_order)
  return out
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    return res.json({ success: true, data: await listRecommendations() })
  } catch (error) {
    console.error('List recommendations error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const row = isIntId(id) ? await selectById('recommendations', id, RECOMMENDATION_COLUMNS) : null
    if (!row) return res.status(404).json({ success: false, error: 'Recommendation not found' })
    return res.json({ success: true, data: formatRecommendation(row) })
  } catch (error) {
    console.error('Get recommendation error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.post('/', [authenticate, authorize('admin'), ...validators(true)], async (req: AuthRequest, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return
    const created = await insertRow('recommendations', { show_on_cv: false, sort_order: 0, ...toPayload(req.body) })
    await markCvDirty()
    return res.status(201).json({ success: true, data: formatRecommendation(created) })
  } catch (error) {
    console.error('Create recommendation error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.put('/:id', [authenticate, authorize('admin'), ...validators(false)], async (req: AuthRequest, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return
    const id = String(req.params.id)
    if (!isIntId(id)) return res.status(404).json({ success: false, error: 'Recommendation not found' })
    const updated = await updateRow('recommendations', id, { ...toPayload(req.body), updated_at: new Date().toISOString() })
    if (!updated) return res.status(404).json({ success: false, error: 'Recommendation not found' })
    await markCvDirty()
    return res.json({ success: true, data: formatRecommendation(updated) })
  } catch (error) {
    console.error('Update recommendation error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.delete('/:id', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id)
    const { data, error } = await getServices().supabaseService.getClient()
      .from('recommendations')
      .delete()
      .eq('id', id)
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) return res.status(404).json({ success: false, error: 'Recommendation not found' })
    await markCvDirty()
    return res.json({ success: true, message: 'Recommendation deleted' })
  } catch (error) {
    console.error('Delete recommendation error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
