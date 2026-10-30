import express from 'express'
import { body } from 'express-validator'
import { Request, Response } from 'express'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'
import { toStringArray, parseListInput } from '../utils/lists'
import { rejectInvalid, sendInvalid, optionalText, FieldError } from '../utils/validation'
import { insertRow, updateRow, selectById, selectRows, Row } from '../utils/db'
import { normaliseCaseStudy, readCaseStudy, hasCaseStudy, featureTitles } from '../utils/caseStudy'
import { markCvDirty } from '../services/cvDirty'

const router = express.Router()

export const PROJECT_STATUSES = ['in_development', 'ideas', 'completed']
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Column lists: current schema, then before the v2 migration (no case_study,
// show_on_site), then before the round-1 migration (no role, platform).
const BASE = 'id, title, slug, description, image, images, technologies, github_url, live_url, featured, date, status, inspiration, created_at, updated_at'
const V1 = `${BASE}, role, platform`
const LIST_COLUMNS = `${V1}, show_on_site, case_study`
const LIST_LEGACY = [V1, BASE]
const FULL_COLUMNS = `${LIST_COLUMNS}, content`
const FULL_LEGACY = [`${V1}, content`, `${BASE}, content`]
const NEW_COLUMNS = ['role', 'platform', 'case_study', 'show_on_site']

export function generateSlug(title: string) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** H-19: public when shown on site and not an idea. Pre-migration rows count as shown. */
export function isPublicProject(p: Row): boolean {
  return p.show_on_site !== false && p.status !== 'ideas'
}

function baseFormat(p: Row) {
  return {
    ...p,
    technologies: toStringArray(p.technologies),
    images: toStringArray(p.images, null),
    featured: Boolean(p.featured),
    role: p.role ?? null,
    platform: p.platform ?? null,
    show_on_site: p.show_on_site !== false
  }
}

/** List rows: no `content` or `case_study`; adds `has_case_study` and `feature_titles` (H-18, H-22). */
export function formatListProject(p: Row) {
  const cs = readCaseStudy(p.case_study)
  const out: Row = { ...baseFormat(p), has_case_study: hasCaseStudy(cs), feature_titles: featureTitles(cs) }
  delete out.case_study
  delete out.content
  return out
}

/** Single reads: everything, `case_study` null when unset. */
export function formatFullProject(p: Row) {
  return { ...baseFormat(p), case_study: readCaseStudy(p.case_study), content: p.content ?? null }
}

/** Featured first, then newest. */
function sortProjects(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => {
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

const listAll = async () => sortProjects(await selectRows('projects', LIST_COLUMNS, LIST_LEGACY))

// ---------- validation ----------

const looseUrl = (value: unknown) => {
  if (value === null || value === '' || value === undefined) return true
  return typeof value === 'string' && (/^https?:\/\/.+/.test(value) || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(value))
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
  textField('description', 5000),
  textField('content', 200000),
  textField('inspiration', 5000),
  body('slug').optional({ nullable: true }).custom((v) => typeof v === 'string').withMessage('Invalid slug'),
  body('status').optional().isIn(PROJECT_STATUSES).withMessage(`Status is one of ${PROJECT_STATUSES.join(', ')}`),
  body('technologies').optional({ nullable: true }).custom((v) => parseListInput(v, ',') !== null).withMessage('Technologies must be a list'),
  body('images').optional({ nullable: true }).custom((v) => parseListInput(v, '\n') !== null).withMessage('Images must be a list'),
  body('image').optional({ nullable: true }).custom((v) => v === '' || typeof v === 'string').withMessage('Image must be a URL'),
  body('image_url').optional({ nullable: true }).custom(looseUrl).withMessage('Image must be a URL'),
  body('github_url').optional({ nullable: true }).custom(looseUrl).withMessage('GitHub URL must be a URL'),
  body('live_url').optional({ nullable: true }).custom(looseUrl).withMessage('Live URL must be a URL'),
  body('featured').optional().custom((v) => typeof v === 'boolean').withMessage('Featured is true or false'),
  body('show_on_site').optional().custom((v) => typeof v === 'boolean').withMessage('Show on site is true or false'),
  body('date').optional({ nullable: true }).custom((v) => typeof v === 'string').withMessage('Date must be text'),
  textField('role', 120),
  textField('platform', 120)
]

/** Validates slug and case_study (beyond express-validator) and builds the DB payload. */
function toPayload(input: Row): { payload: Row; errors: FieldError[] } {
  const errors: FieldError[] = []
  const out: Row = {}
  if ('title' in input) out.title = String(input.title).trim()
  if ('description' in input) out.description = input.description == null ? '' : String(input.description).trim()
  if ('content' in input) out.content = input.content ?? null
  if ('inspiration' in input) out.inspiration = input.inspiration ?? null
  if ('status' in input) out.status = input.status
  if ('technologies' in input) out.technologies = parseListInput(input.technologies, ',') || []
  if ('images' in input) out.images = parseListInput(input.images, '\n') || []
  if ('image_url' in input) out.image = optionalText(input.image_url)
  if ('image' in input) out.image = optionalText(input.image)
  if ('github_url' in input) out.github_url = optionalText(input.github_url)
  if ('live_url' in input) out.live_url = optionalText(input.live_url)
  if ('featured' in input) out.featured = input.featured === true
  if ('show_on_site' in input) out.show_on_site = input.show_on_site === true
  if ('date' in input) out.date = optionalText(input.date)
  if ('role' in input) out.role = optionalText(input.role)
  if ('platform' in input) out.platform = optionalText(input.platform)
  if ('case_study' in input) {
    const cs = normaliseCaseStudy(input.case_study)
    errors.push(...cs.errors)
    out.case_study = cs.value
  }
  return { payload: out, errors }
}

async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  let q = getServices().supabaseService.getClient().from('projects').select('id').eq('slug', slug)
  if (exceptId) q = q.neq('id', exceptId)
  const { data, error } = await q.limit(1)
  if (error) throw error
  return Array.isArray(data) && data.length > 0
}

/** H-4: one spotlight. Clears `featured` on every other project; returns their ids. */
async function clearOtherFeatured(id: number | string): Promise<number[]> {
  const { data, error } = await getServices().supabaseService.getClient()
    .from('projects')
    .update({ featured: false, updated_at: new Date().toISOString() })
    .neq('id', id)
    .eq('featured', true)
    .select('id')
  if (error) throw error
  return (data || []).map((r: Row) => Number(r.id))
}

// ---------- public reads ----------

// Public projects only (H-19), featured first then newest.
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = (await listAll()).filter(isPublicProject)
    return res.json({ success: true, data: rows.map(formatListProject) })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch projects' })
  }
})

// ---------- admin reads (registered before /:id) ----------

router.get('/admin/all', [authenticate, authorize('admin')], async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await listAll()
    return res.json({ success: true, data: rows.map(formatListProject) })
  } catch (error) {
    console.error('Admin list projects error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/admin/:id', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const project = await selectById('projects', String(req.params.id), FULL_COLUMNS, FULL_LEGACY)
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' })
    return res.json({ success: true, data: formatFullProject(project) })
  } catch (error) {
    console.error('Admin get project error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Single public project by slug (404 when hidden)
router.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug)
    if (!slug || !SLUG_RE.test(slug)) {
      return res.status(400).json({ success: false, error: 'Invalid slug' })
    }
    const rows = await selectRows('projects', FULL_COLUMNS, FULL_LEGACY, (q) => q.eq('slug', slug).limit(1))
    const project = rows[0]
    if (!project || !isPublicProject(project)) {
      return res.status(404).json({ success: false, error: 'Project not found' })
    }
    return res.json({ success: true, data: formatFullProject(project) })
  } catch (error) {
    console.error('Get project by slug error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Single public project by id (404 when hidden)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await selectById('projects', String(req.params.id), FULL_COLUMNS, FULL_LEGACY)
    if (!project || !isPublicProject(project)) {
      return res.status(404).json({ success: false, error: 'Project not found' })
    }
    return res.json({ success: true, data: formatFullProject(project) })
  } catch (error) {
    console.error('Get project error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ---------- writes ----------

router.post('/', [authenticate, authorize('admin'), ...validators(true)], async (req: AuthRequest, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return
    const { payload, errors } = toPayload(req.body)
    if (errors.length) return sendInvalid(res, errors)

    const requested = typeof req.body.slug === 'string' ? req.body.slug.trim() : ''
    const baseSlug = requested || generateSlug(payload.title)
    if (!baseSlug || !SLUG_RE.test(baseSlug)) {
      return res.status(400).json({ success: false, error: 'Invalid slug', details: [{ path: 'slug', msg: 'Invalid slug' }] })
    }
    let slug = baseSlug
    for (let n = 1; await slugTaken(slug); n++) slug = `${baseSlug}-${n}`

    const created = await insertRow(
      'projects',
      {
        description: '',
        content: null,
        inspiration: null,
        images: [],
        technologies: [],
        status: 'in_development',
        featured: false,
        show_on_site: true,
        ...payload,
        slug
      },
      NEW_COLUMNS
    )

    const unfeatured = created.featured ? await clearOtherFeatured(created.id) : []
    await markCvDirty()
    return res.status(201).json({ success: true, data: { ...formatFullProject(created), unfeatured } })
  } catch (error) {
    console.error('Create project error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.put('/:id', [authenticate, authorize('admin'), ...validators(false)], async (req: AuthRequest, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return
    const id = String(req.params.id)
    const { payload, errors } = toPayload(req.body)
    if (errors.length) return sendInvalid(res, errors)

    if ('slug' in req.body) {
      const slug = String(req.body.slug ?? '').trim()
      if (!SLUG_RE.test(slug)) {
        return res.status(400).json({ success: false, error: 'Invalid slug', details: [{ path: 'slug', msg: 'Invalid slug' }] })
      }
      if (await slugTaken(slug, id)) {
        return res.status(400).json({
          success: false,
          error: 'Slug already exists. Please choose a different slug.',
          details: [{ path: 'slug', msg: 'Slug already exists' }]
        })
      }
      payload.slug = slug
    }

    payload.updated_at = new Date().toISOString()
    const updated = await updateRow('projects', id, payload, NEW_COLUMNS)
    if (!updated) return res.status(404).json({ success: false, error: 'Project not found' })

    const unfeatured = payload.featured === true ? await clearOtherFeatured(updated.id) : []
    await markCvDirty()
    return res.json({ success: true, data: { ...formatFullProject(updated), unfeatured } })
  } catch (error) {
    console.error('Update project error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.delete('/:id', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id)
    const { data: deletedProject, error } = await getServices().supabaseService.getClient()
      .from('projects')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error || !deletedProject) {
      return res.status(404).json({ success: false, error: 'Project not found' })
    }

    await markCvDirty()
    return res.json({ success: true, message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Delete project error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
