import express from 'express'
import { body } from 'express-validator'
import { Request, Response } from 'express'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'
import { rejectInvalid } from '../utils/validation'

const router = express.Router()

export const FLAG_KEY_RE = /^[a-z][a-z0-9_]{0,63}$/
export const FLAG_KEY_MESSAGE = 'Flag keys use lower case letters, numbers and underscores.'

/** Built-in flags: seeded on the admin list, can't be deleted (H-8). */
export const KNOWN_FLAGS = [
  { name: 'maintenance_mode', description: 'Shows every visitor the maintenance page instead of the site.', enabled: false },
  { name: 'open_to_work', description: 'The Open to work badge beside your name on the home page.', enabled: false },
  { name: 'show_marbl', description: 'Includes Marbl in the apps the Privacy and Terms pages cover.', enabled: false }
] as const

const KNOWN_NAMES = new Set<string>(KNOWN_FLAGS.map((f) => f.name))
const COLUMNS = 'id, name, description, enabled, created_at, updated_at'

/** Inserts missing built-ins; existing rows (and their values) are untouched. */
async function ensureKnownFlags() {
  try {
    const client = getServices().supabaseService.getClient()
    await client.from('feature_flags').upsert([...KNOWN_FLAGS], { onConflict: 'name', ignoreDuplicates: true })
  } catch (error) {
    console.error('Ensure known feature flags error:', error)
  }
}

async function findFlag(column: 'id' | 'name', value: string) {
  const { data, error } = await getServices().supabaseService.getClient()
    .from('feature_flags')
    .select(COLUMNS)
    .eq(column, value)
    .maybeSingle()
  if (error) throw error
  return data as Record<string, any> | null
}

// Maintenance mode (public, un-enveloped; unchanged)
router.get('/maintenance', async (_req: Request, res: Response) => {
  try {
    const { data: maintenanceFlag, error } = await getServices().supabaseService.getClient()
      .from('feature_flags')
      .select('enabled')
      .eq('name', 'maintenance_mode')
      .single()
    if (error) return res.json({ success: true, maintenance_mode: false })
    return res.json({ success: true, maintenance_mode: maintenanceFlag?.enabled || false })
  } catch (error) {
    console.error('Check maintenance mode error:', error)
    return res.json({ success: true, maintenance_mode: false })
  }
})

// Every flag as name → enabled (public). Built-ins missing from the table read false.
router.get('/public', async (_req: Request, res: Response) => {
  const map: Record<string, boolean> = Object.fromEntries(KNOWN_FLAGS.map((f) => [f.name, false]))
  try {
    const { data, error } = await getServices().supabaseService.getClient()
      .from('feature_flags')
      .select('name, enabled')
    if (error) throw error
    for (const f of data || []) map[f.name] = Boolean(f.enabled)
  } catch (error) {
    // Fail safe: everything off rather than breaking the site.
    console.error('Public feature flags error:', error)
  }
  return res.json({ success: true, data: map })
})

// One flag by name (public, un-enveloped; unchanged). Registered before /:id.
router.get('/public/:name', async (req: Request, res: Response) => {
  try {
    const name = String(req.params.name)
    const { data: flag, error } = await getServices().supabaseService.getClient()
      .from('feature_flags')
      .select('enabled')
      .eq('name', name)
      .single()
    if (error) return res.json({ success: true, enabled: false })
    return res.json({ success: true, enabled: flag?.enabled || false })
  } catch (error) {
    console.error('Check public feature flag error:', error)
    return res.json({ success: true, enabled: false })
  }
})

// All flags (admin); seeds the built-ins first
router.get('/', [authenticate, authorize('admin')], async (_req: AuthRequest, res: Response) => {
  try {
    await ensureKnownFlags()
    const { data: featureFlags, error } = await getServices().supabaseService.getClient()
      .from('feature_flags')
      .select(COLUMNS)
      .order('name', { ascending: true })
    if (error) throw error
    return res.json({ success: true, data: featureFlags })
  } catch (error) {
    console.error('Get feature flags error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/:id', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const flag = await findFlag('id', String(req.params.id))
    if (!flag) return res.status(404).json({ success: false, error: 'Feature flag not found' })
    return res.json({ success: true, data: flag })
  } catch (error) {
    console.error('Get feature flag error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Create (admin). New flags always start off.
router.post('/', [
  authenticate,
  authorize('admin'),
  body('description').optional({ nullable: true }).isString().trim().isLength({ max: 500 })
], async (req: AuthRequest, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
    if (!FLAG_KEY_RE.test(name)) {
      return res.status(400).json({ success: false, error: FLAG_KEY_MESSAGE, details: [{ path: 'name', msg: FLAG_KEY_MESSAGE }] })
    }
    const duplicate = () => res.status(409).json({ success: false, error: `A flag called ${name} already exists.` })
    if (await findFlag('name', name)) return duplicate()

    const { data: newFlag, error } = await getServices().supabaseService.getClient()
      .from('feature_flags')
      .insert({ name, description: req.body.description || null, enabled: false })
      .select()
      .single()
    if (error) {
      if (error.code === '23505') return duplicate()
      throw error
    }
    return res.status(201).json({ success: true, data: newFlag })
  } catch (error) {
    console.error('Create feature flag error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Update (admin): enabled and description only; the key can't change.
router.put('/:id', [
  authenticate,
  authorize('admin'),
  body('description').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
  body('enabled').optional().custom((v) => typeof v === 'boolean').withMessage('Enabled is true or false')
], async (req: AuthRequest, res: Response) => {
  try {
    if (rejectInvalid(req, res)) return
    const id = String(req.params.id)
    const existing = await findFlag('id', id)
    if (!existing) return res.status(404).json({ success: false, error: 'Feature flag not found' })

    if ('name' in req.body && req.body.name !== existing.name) {
      return res.status(400).json({
        success: false,
        error: 'Flag keys cannot be changed.',
        details: [{ path: 'name', msg: 'Flag keys cannot be changed.' }]
      })
    }

    const update: Record<string, any> = { updated_at: new Date().toISOString() }
    if ('enabled' in req.body) update.enabled = req.body.enabled
    if ('description' in req.body) update.description = req.body.description || null

    const { data: updatedFlag, error } = await getServices().supabaseService.getClient()
      .from('feature_flags')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error || !updatedFlag) return res.status(404).json({ success: false, error: 'Feature flag not found' })
    return res.json({ success: true, data: updatedFlag })
  } catch (error) {
    console.error('Update feature flag error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Delete (admin); built-ins can't be deleted.
router.delete('/:id', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id)
    const existing = await findFlag('id', id)
    if (!existing) return res.status(404).json({ success: false, error: 'Feature flag not found' })
    if (KNOWN_NAMES.has(existing.name)) {
      return res.status(400).json({ success: false, error: 'Built-in flags cannot be deleted.' })
    }
    const { error } = await getServices().supabaseService.getClient().from('feature_flags').delete().eq('id', id)
    if (error) throw error
    return res.json({ success: true, message: 'Feature flag deleted successfully' })
  } catch (error) {
    console.error('Delete feature flag error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
