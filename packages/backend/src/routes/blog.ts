import express from 'express'
import { body } from 'express-validator'
import { Request, Response } from 'express'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'
import { toStringArray, parseListInput } from '../utils/lists'
import { rejectInvalid, sendInvalid, FieldError } from '../utils/validation'
import { insertRow, updateRow, selectById, Row } from '../utils/db'
import { generateSlug } from './projects'

const router = express.Router()

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const BLOG_DEFAULT_LIMIT = 50
export const BLOG_MAX_LIMIT = 100

const LIST_COLUMNS = 'id, title, slug, excerpt, created_at, category, tags, featured, author, read_time, cover_image'
const SINGLE_COLUMNS = 'id, title, slug, excerpt, content, author, read_time, created_at, category, tags, featured, cover_image'
const ADMIN_COLUMNS = 'id, title, slug, excerpt, content, author, read_time, created_at, category, tags, featured, published, cover_image'

/** `created_at` is the publish date (the admin's Publish date writes it). */
export function formatPost(post: Row) {
  const out: Row = {
    ...post,
    tags: toStringArray(post.tags),
    featured: Boolean(post.featured),
    publish_date: post.created_at
  }
  if ('published' in post) out.published = Boolean(post.published)
  return out
}

/** Clamps `limit` to 1..100 (default 50) and `offset` to >= 0. */
export function pageParams(limit: unknown, offset: unknown): { from: number; to: number } {
  let l = parseInt(String(limit ?? ''), 10)
  if (!Number.isFinite(l) || l < 1) l = BLOG_DEFAULT_LIMIT
  l = Math.min(l, BLOG_MAX_LIMIT)
  let o = parseInt(String(offset ?? ''), 10)
  if (!Number.isFinite(o) || o < 0) o = 0
  return { from: o, to: o + l - 1 }
}

/** Removes the characters that would break or extend a PostgREST `or` filter. */
export function cleanSearch(search: unknown): string {
  return String(search ?? '').replace(/[,()%*\\]/g, ' ').trim()
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
  textField('excerpt', 1000),
  textField('content', 200000),
  textField('category', 100),
  textField('author', 255),
  textField('cover_image', 2000),
  body('slug').optional({ nullable: true }).custom((v) => typeof v === 'string').withMessage('Invalid slug'),
  body('tags').optional({ nullable: true }).custom((v) => parseListInput(v, ',') !== null).withMessage('Tags must be a list'),
  body('featured').optional().custom((v) => typeof v === 'boolean').withMessage('Featured is true or false'),
  body('published').optional().custom((v) => typeof v === 'boolean').withMessage('Published is true or false'),
  body('read_time').optional({ nullable: true }).isInt({ min: 0, max: 600 }).withMessage('Read time is a whole number of minutes').toInt(),
  body('publish_date').optional({ nullable: true }).custom((v) => v === '' || (typeof v === 'string' && !Number.isNaN(Date.parse(v)))).withMessage('Publish date must be a date')
]

function toPayload(input: Row): Row {
  const out: Row = {}
  for (const key of ['title', 'excerpt', 'content', 'category']) {
    if (key in input) out[key] = input[key] == null ? '' : String(input[key]).trim()
  }
  if ('author' in input && input.author) out.author = String(input.author).trim()
  if ('read_time' in input && input.read_time !== null && input.read_time !== undefined) out.read_time = input.read_time
  if ('cover_image' in input) out.cover_image = input.cover_image ? String(input.cover_image).trim() || null : null
  if ('tags' in input) out.tags = parseListInput(input.tags, ',') || []
  if ('featured' in input) out.featured = input.featured === true
  if ('published' in input) out.published = input.published === true
  if ('publish_date' in input && input.publish_date) out.created_at = input.publish_date
  return out
}

/** A published post needs an excerpt, content and category (H-3). */
function publishErrors(merged: Row): FieldError[] {
  if (!merged.published) return []
  return ['excerpt', 'content', 'category']
    .filter((k) => !String(merged[k] ?? '').trim())
    .map((k) => ({ path: k, msg: `${k[0].toUpperCase()}${k.slice(1)} is required to publish` }))
}

async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  let q = getServices().supabaseService.getClient().from('blog_posts').select('id').eq('slug', slug)
  if (exceptId) q = q.neq('id', exceptId)
  const { data, error } = await q.limit(1)
  if (error) throw error
  return Array.isArray(data) && data.length > 0
}

async function clearOtherFeatured(id: number | string): Promise<number[]> {
  const { data, error } = await getServices().supabaseService.getClient()
    .from('blog_posts')
    .update({ featured: false, updated_at: new Date().toISOString() })
    .neq('id', id)
    .eq('featured', true)
    .select('id')
  if (error) throw error
  return (data || []).map((r: Row) => Number(r.id))
}

// Published posts (public), newest publish date first
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search, limit, offset } = req.query
    const { from, to } = pageParams(limit, offset)

    let query = getServices().supabaseService.getClient()
      .from('blog_posts')
      .select(LIST_COLUMNS)
      .eq('published', true)

    if (category) query = query.eq('category', String(category))

    const term = cleanSearch(search)
    if (term) query = query.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`)

    const { data: posts, error } = await query.order('created_at', { ascending: false }).range(from, to)
    if (error) throw error

    return res.json({ success: true, data: (posts || []).map(formatPost) })
  } catch (error) {
    console.error('Get blog posts error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Every post incl. drafts (admin). Registered before /:slug.
router.get('/admin/all', [authenticate, authorize('admin')], async (_req: AuthRequest, res: Response) => {
  try {
    const { data: posts, error } = await getServices().supabaseService.getClient()
      .from('blog_posts')
      .select(ADMIN_COLUMNS)
      .order('created_at', { ascending: false })
    if (error) throw error
    return res.json({ success: true, data: (posts || []).map(formatPost) })
  } catch (error) {
    console.error('Get all blog posts error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Single published post by slug (public)
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug)
    const { data: post, error } = await getServices().supabaseService.getClient()
      .from('blog_posts')
      .select(SINGLE_COLUMNS)
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle()
    if (error) throw error
    if (!post) return res.status(404).json({ success: false, error: 'Blog post not found' })
    return res.json({ success: true, data: formatPost(post) })
  } catch (error) {
    console.error('Get blog post error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Create (admin). A draft needs only a title.
router.post('/', [authenticate, authorize('admin'), ...validators(true)], async (req: AuthRequest, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return

    const payload: Row = {
      excerpt: '',
      content: '',
      category: '',
      tags: [],
      featured: false,
      published: false,
      ...toPayload(req.body)
    }
    const errors = publishErrors(payload)
    if (errors.length) return sendInvalid(res, errors)

    const requested = typeof req.body.slug === 'string' ? req.body.slug.trim() : ''
    const baseSlug = requested || generateSlug(payload.title)
    if (!baseSlug || !SLUG_RE.test(baseSlug)) {
      return res.status(400).json({ success: false, error: 'Invalid slug', details: [{ path: 'slug', msg: 'Invalid slug' }] })
    }
    let slug = baseSlug
    for (let n = 1; await slugTaken(slug); n++) slug = `${baseSlug}-${n}`

    const newPost = await insertRow('blog_posts', { ...payload, slug })
    const unfeatured = newPost.featured ? await clearOtherFeatured(newPost.id) : []
    return res.status(201).json({ success: true, data: { ...formatPost(newPost), published: Boolean(newPost.published), unfeatured } })
  } catch (error) {
    console.error('Create blog post error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Update (admin, partial). The publish rule applies to existing + body.
router.put('/:id', [authenticate, authorize('admin'), ...validators(false)], async (req: AuthRequest, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return
    const id = String(req.params.id)

    const existing = await selectById('blog_posts', id, ADMIN_COLUMNS)
    if (!existing) return res.status(404).json({ success: false, error: 'Blog post not found' })

    const payload = toPayload(req.body)
    const errors = publishErrors({ ...existing, ...payload })
    if (errors.length) return sendInvalid(res, errors)

    if ('slug' in req.body) {
      const slug = String(req.body.slug ?? '').trim()
      if (!SLUG_RE.test(slug)) {
        return res.status(400).json({ success: false, error: 'Invalid slug', details: [{ path: 'slug', msg: 'Invalid slug' }] })
      }
      if (slug !== existing.slug && (await slugTaken(slug, id))) {
        return res.status(400).json({
          success: false,
          error: 'Slug already exists. Please choose a different slug.',
          details: [{ path: 'slug', msg: 'Slug already exists' }]
        })
      }
      payload.slug = slug
    }

    payload.updated_at = new Date().toISOString()
    const updated = await updateRow('blog_posts', id, payload)
    if (!updated) return res.status(404).json({ success: false, error: 'Blog post not found' })

    const unfeatured = payload.featured === true ? await clearOtherFeatured(updated.id) : []
    return res.json({ success: true, data: { ...formatPost(updated), published: Boolean(updated.published), unfeatured } })
  } catch (error) {
    console.error('Update blog post error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Delete (admin)
router.delete('/:id', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id)
    const { data: deletedPost, error } = await getServices().supabaseService.getClient()
      .from('blog_posts')
      .delete()
      .eq('id', id)
      .select()
      .single()
    if (error || !deletedPost) return res.status(404).json({ success: false, error: 'Blog post not found' })
    return res.json({ success: true, message: 'Blog post deleted successfully' })
  } catch (error) {
    console.error('Delete blog post error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
