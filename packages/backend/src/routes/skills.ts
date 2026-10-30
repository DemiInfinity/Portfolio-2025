import express from 'express'
import { body, validationResult } from 'express-validator'
import { Request, Response } from 'express'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'
import { markCvDirty } from '../services/cvDirty'
import { optionalText } from '../utils/validation'

const router = express.Router()

// Get all skills (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { supabaseService } = getServices()
    
    const { data: skills, error } = await supabaseService.getClient()
      .from('skills')
      .select('id, name, category, level, description, created_at, updated_at')
      .order('category', { ascending: true })
      .order('name', { ascending: true })
    
    if (error) throw error

    return res.json({
      success: true,
      data: skills
    })
  } catch (error) {
    console.error('Get skills error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Get skills by category (public)
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const category = String(req.params.category)
    const { supabaseService } = getServices()
    const { data: skills, error } = await supabaseService.getClient()
      .from('skills')
      .select('id, name, category, level, description')
      .eq('category', category)
      .order('level', { ascending: false })
      .order('name', { ascending: true })
    
    if (error) throw error

    return res.json({
      success: true,
      data: skills
    })
  } catch (error) {
    console.error('Get skills by category error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Create skill (admin only)
router.post('/', [
  authenticate,
  authorize('admin'),
  body('name').isLength({ min: 1 }).trim(),
  body('category').isLength({ min: 1 }).trim(),
  body('level').isIn(['beginner', 'intermediate', 'advanced', 'expert']),
  body('description').optional({ nullable: true, checkFalsy: true }).trim()
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

    const { name, category, level, description } = req.body
    const { supabaseService } = getServices()

    // Handle empty description - set to null if empty string
    const skillDescription = description && description.trim() !== '' ? description.trim() : null

    const newSkill = await supabaseService.insert('skills', {
      name: name.trim(),
      category: category.trim(),
      level,
      description: skillDescription
    })

    await markCvDirty()
    return res.status(201).json({
      success: true,
      data: newSkill
    })
  } catch (error) {
    console.error('Create skill error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Update skill (admin only)
router.put('/:id', [
  authenticate,
  authorize('admin'),
  body('name').optional().isLength({ min: 1 }).trim(),
  body('category').optional().isLength({ min: 1 }).trim(),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']),
  body('description').optional({ nullable: true }).custom((v) => typeof v === 'string').withMessage('Description must be text')
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

    const id = String(req.params.id)
    const updateData = req.body
    const { supabaseService } = getServices()

    // Check if skill exists
    try {
      await supabaseService.selectOne('skills', id)
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found'
      })
    }

    // Only known fields; an empty description clears it.
    const payload: Record<string, any> = {}
    if (updateData.name !== undefined) payload.name = String(updateData.name).trim()
    if (updateData.category !== undefined) payload.category = String(updateData.category).trim()
    if (updateData.level !== undefined) payload.level = updateData.level
    if ('description' in updateData) payload.description = optionalText(updateData.description)
    payload.updated_at = new Date().toISOString()

    const updatedSkill = await supabaseService.update('skills', id, payload)
    await markCvDirty()

    return res.json({
      success: true,
      data: updatedSkill
    })
  } catch (error) {
    console.error('Update skill error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Delete skill (admin only)
router.delete('/:id', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id)
    const { supabaseService } = getServices()

    // Check if skill exists
    try {
      await supabaseService.selectOne('skills', id)
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found'
      })
    }

    await supabaseService.delete('skills', id)
    await markCvDirty()

    return res.json({
      success: true,
      message: 'Skill deleted successfully'
    })
  } catch (error) {
    console.error('Delete skill error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

export default router
