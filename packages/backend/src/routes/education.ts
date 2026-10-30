import { Router, Request, Response } from 'express'
import { body } from 'express-validator'
import { getServices } from '../services'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { normaliseDate, isDateInput, isRequiredDateInput } from '../utils/dates'
import { toStringArray, parseListInput } from '../utils/lists'
import { rejectInvalid, optionalText } from '../utils/validation'
import { insertRow, updateRow, selectById, selectRows, Row } from '../utils/db'
import { markCvDirty } from '../services/cvDirty'

const router = Router()

const COLUMNS = 'id, institution, degree, field_of_study, location, start_date, end_date, gpa, description, achievements, created_at, updated_at'
const LEGACY_COLUMNS = 'id, institution, degree, field_of_study, location, start_date, end_date, gpa, description, achievements'

export function formatEducation(edu: Row): Row {
  return {
    ...edu,
    grade: edu.gpa ?? null, // `grade` is the name the frontend and admin use
    achievements: toStringArray(edu.achievements, null)
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

// PUT is a full replace, so both use the same rules.
const validators = [
  body('institution').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Institution is required'),
  body('degree').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Degree is required'),
  body('start_date').custom(isRequiredDateInput).withMessage('Start date must be YYYY-MM or YYYY-MM-DD'),
  body('end_date').optional({ nullable: true }).custom(isDateInput).withMessage('End date must be YYYY-MM or YYYY-MM-DD'),
  textField('field_of_study', 200),
  textField('location', 200),
  textField('description', 5000),
  body('grade').optional({ nullable: true }).custom((v) => typeof v === 'string' || typeof v === 'number').withMessage('Grade must be text'),
  body('achievements').optional({ nullable: true }).custom((v) => parseListInput(v, '\n') !== null).withMessage('Achievements must be a list')
]

function toPayload(input: Row): Row {
  const grade = input.grade === null || input.grade === undefined ? '' : String(input.grade).trim()
  return {
    institution: String(input.institution).trim(),
    degree: String(input.degree).trim(),
    field_of_study: optionalText(input.field_of_study),
    location: optionalText(input.location),
    start_date: normaliseDate(input.start_date),
    end_date: normaliseDate(input.end_date),
    // DB column is 10 characters
    gpa: grade ? grade.substring(0, 10) : null,
    description: optionalText(input.description),
    achievements: parseListInput(input.achievements, '\n') || []
  }
}

// Get all education (public)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const education = await selectRows('education', COLUMNS, LEGACY_COLUMNS, (q) => q.order('start_date', { ascending: false }))
    return res.json({ success: true, data: (education || []).map(formatEducation) })
  } catch (error) {
    console.error('Get education error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Get single education by ID (public)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const education = await selectById('education', id, COLUMNS, LEGACY_COLUMNS)
    if (!education) {
      return res.status(404).json({ success: false, error: 'Education not found' })
    }
    return res.json({ success: true, data: formatEducation(education) })
  } catch (error) {
    console.error('Get education by ID error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Create new education (admin only)
router.post('/', [authenticate, authorize('admin'), ...validators], async (req: Request, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return
    const result = await insertRow('education', toPayload(req.body))
    await markCvDirty()
    return res.status(201).json({ success: true, data: formatEducation(result) })
  } catch (error) {
    console.error('Create education error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Update education (admin only; full replace: send the whole form)
router.put('/:id', [authenticate, authorize('admin'), ...validators], async (req: Request, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return
    const id = String(req.params.id)
    const result = await updateRow('education', id, { ...toPayload(req.body), updated_at: new Date().toISOString() })
    if (!result) {
      return res.status(404).json({ success: false, error: 'Education not found' })
    }
    await markCvDirty()
    return res.json({ success: true, data: formatEducation(result) })
  } catch (error) {
    console.error('Update education error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Delete education (admin only)
router.delete('/:id', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const { supabaseService } = getServices()
    const id = String(req.params.id)

    const { data: deletedEducation, error } = await supabaseService.getClient()
      .from('education')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error || !deletedEducation) {
      return res.status(404).json({ success: false, error: 'Education not found' })
    }

    await markCvDirty()
    return res.json({ success: true, message: 'Education deleted successfully' })
  } catch (error) {
    console.error('Delete education error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
