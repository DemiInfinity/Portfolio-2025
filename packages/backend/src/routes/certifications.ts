import { Router, Request, Response } from 'express'
import { body } from 'express-validator'
import { getServices } from '../services'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { normaliseDate, isDateInput, isRequiredDateInput } from '../utils/dates'
import { toStringArray, parseListInput } from '../utils/lists'
import { rejectInvalid, optionalText, isOptionalHttpUrl } from '../utils/validation'
import { insertRow, updateRow, selectById, selectRows, Row } from '../utils/db'
import { markCvDirty } from '../services/cvDirty'

const router = Router()

const COLUMNS = 'id, name, issuer, issue_date, expiry_date, credential_id, credential_url, description, skills, created_at, updated_at'
const LEGACY_COLUMNS = 'id, name, issuer, issue_date, expiry_date, credential_id, credential_url, description, skills'

export function formatCertification(cert: Row): Row {
  return { ...cert, skills: toStringArray(cert.skills, null) }
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
  body('name').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Name is required'),
  body('issuer').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Issuer is required'),
  body('issue_date').custom(isRequiredDateInput).withMessage('Issue date must be YYYY-MM or YYYY-MM-DD'),
  body('expiry_date').optional({ nullable: true }).custom(isDateInput).withMessage('Expiry date must be YYYY-MM or YYYY-MM-DD'),
  textField('credential_id', 200),
  body('credential_url').optional({ nullable: true }).custom(isOptionalHttpUrl).withMessage('Credential URL must start with http:// or https://'),
  textField('description', 5000),
  body('skills').optional({ nullable: true }).custom((v) => parseListInput(v, ',') !== null).withMessage('Skills must be a list')
]

function toPayload(input: Row): Row {
  return {
    name: String(input.name).trim(),
    issuer: String(input.issuer).trim(),
    issue_date: normaliseDate(input.issue_date),
    expiry_date: normaliseDate(input.expiry_date),
    credential_id: optionalText(input.credential_id),
    credential_url: optionalText(input.credential_url),
    description: optionalText(input.description),
    skills: parseListInput(input.skills, ',') || []
  }
}

// Get all certifications (public)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const certifications = await selectRows('certifications', COLUMNS, LEGACY_COLUMNS, (q) => q.order('issue_date', { ascending: false }))
    return res.json({ success: true, data: (certifications || []).map(formatCertification) })
  } catch (error) {
    console.error('Get certifications error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Get single certification by ID (public)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const certification = await selectById('certifications', id, COLUMNS, LEGACY_COLUMNS)
    if (!certification) {
      return res.status(404).json({ success: false, error: 'Certification not found' })
    }
    return res.json({ success: true, data: formatCertification(certification) })
  } catch (error) {
    console.error('Get certification by ID error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Create new certification (admin only)
router.post('/', [authenticate, authorize('admin'), ...validators], async (req: Request, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return
    const result = await insertRow('certifications', toPayload(req.body))
    await markCvDirty()
    return res.status(201).json({ success: true, data: formatCertification(result) })
  } catch (error) {
    console.error('Create certification error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Update certification (admin only; full replace: send the whole form)
router.put('/:id', [authenticate, authorize('admin'), ...validators], async (req: Request, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return
    const id = String(req.params.id)
    const result = await updateRow('certifications', id, { ...toPayload(req.body), updated_at: new Date().toISOString() })
    if (!result) {
      return res.status(404).json({ success: false, error: 'Certification not found' })
    }
    await markCvDirty()
    return res.json({ success: true, data: formatCertification(result) })
  } catch (error) {
    console.error('Update certification error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Delete certification (admin only)
router.delete('/:id', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const { supabaseService } = getServices()
    const id = String(req.params.id)

    const { data: deletedCertification, error } = await supabaseService.getClient()
      .from('certifications')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error || !deletedCertification) {
      return res.status(404).json({ success: false, error: 'Certification not found' })
    }

    await markCvDirty()
    return res.json({ success: true, message: 'Certification deleted successfully' })
  } catch (error) {
    console.error('Delete certification error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
