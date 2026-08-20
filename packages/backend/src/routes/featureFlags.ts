import express from 'express'
import { body, validationResult } from 'express-validator'
import { Request, Response } from 'express'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'

const router = express.Router()

// Check maintenance mode (public)
router.get('/maintenance', async (req: Request, res: Response) => {
  try {
    const { supabaseService } = getServices()
    const { data: maintenanceFlag, error } = await supabaseService.getClient()
      .from('feature_flags')
      .select('enabled')
      .eq('name', 'maintenance_mode')
      .single()
    
    if (error) {
      // If maintenance flag doesn't exist, default to false
      return res.json({
        success: true,
        maintenance_mode: false
      })
    }

    return res.json({
      success: true,
      maintenance_mode: maintenanceFlag?.enabled || false
    })
  } catch (error) {
    console.error('Check maintenance mode error:', error)
    // Default to false on error to avoid blocking users
    return res.json({
      success: true,
      maintenance_mode: false
    })
  }
})

// Check any single flag by name (public) - generic version of /maintenance
// above, for flags the frontend needs to read without exposing the full
// admin list. Must stay registered before GET /:id below, or a request like
// /public/open_to_work would get matched as :id="public" by that route
// instead and 401 under its admin auth.
router.get('/public/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params
    const { supabaseService } = getServices()
    const { data: flag, error } = await supabaseService.getClient()
      .from('feature_flags')
      .select('enabled')
      .eq('name', name)
      .single()

    if (error) {
      // Flag doesn't exist yet - default to disabled rather than erroring,
      // same fail-safe behavior as /maintenance above.
      return res.json({
        success: true,
        enabled: false
      })
    }

    return res.json({
      success: true,
      enabled: flag?.enabled || false
    })
  } catch (error) {
    console.error('Check public feature flag error:', error)
    return res.json({
      success: true,
      enabled: false
    })
  }
})

// Get all feature flags (admin only)
router.get('/', [
  authenticate,
  authorize('admin')
], async (req: AuthRequest, res: Response) => {
  try {
    const { supabaseService } = getServices()
    const { data: featureFlags, error } = await supabaseService.getClient()
      .from('feature_flags')
      .select('id, name, description, enabled, created_at, updated_at')
      .order('name', { ascending: true })
    
    if (error) throw error

    return res.json({
      success: true,
      data: featureFlags
    })
  } catch (error) {
    console.error('Get feature flags error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Get single feature flag (admin only)
router.get('/:id', [
  authenticate,
  authorize('admin')
], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { supabaseService } = getServices()
    
    const { data: featureFlag, error } = await supabaseService.getClient()
      .from('feature_flags')
      .select('id, name, description, enabled, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error || !featureFlag) {
      return res.status(404).json({
        success: false,
        error: 'Feature flag not found'
      })
    }

    return res.json({
      success: true,
      data: featureFlag
    })
  } catch (error) {
    console.error('Get feature flag error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Create feature flag (admin only)
router.post('/', [
  authenticate,
  authorize('admin'),
  body('name').isLength({ min: 1 }).trim(),
  body('description').optional().isLength({ min: 1 }).trim(),
  body('enabled').optional().isBoolean()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: errors.array()
      })
    }

    const {
      name,
      description,
      enabled = false
    } = req.body

    const { supabaseService } = getServices()
    
    const { data: newFlag, error } = await supabaseService.getClient()
      .from('feature_flags')
      .insert({
        name,
        description,
        enabled
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      })
    }

    return res.status(201).json({
      success: true,
      data: newFlag
    })
  } catch (error) {
    console.error('Create feature flag error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Update feature flag (admin only)
router.put('/:id', [
  authenticate,
  authorize('admin'),
  body('name').optional().isLength({ min: 1 }).trim(),
  body('description').optional().isLength({ min: 1 }).trim(),
  body('enabled').optional().isBoolean()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: errors.array()
      })
    }

    const { id } = req.params
    const updateData = req.body
    const { supabaseService } = getServices()

    // Update the feature flag
    const { data: updatedFlag, error } = await supabaseService.getClient()
      .from('feature_flags')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error || !updatedFlag) {
      return res.status(404).json({
        success: false,
        error: 'Feature flag not found'
      })
    }

    return res.json({
      success: true,
      data: updatedFlag
    })
  } catch (error) {
    console.error('Update feature flag error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Delete feature flag (admin only)
router.delete('/:id', [
  authenticate,
  authorize('admin')
], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { supabaseService } = getServices()

    const { data: deletedFlag, error } = await supabaseService.getClient()
      .from('feature_flags')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error || !deletedFlag) {
      return res.status(404).json({
        success: false,
        error: 'Feature flag not found'
      })
    }

    return res.json({
      success: true,
      message: 'Feature flag deleted successfully'
    })
  } catch (error) {
    console.error('Delete feature flag error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

export default router
