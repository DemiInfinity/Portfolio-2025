import express from 'express'
import { body, validationResult } from 'express-validator'
import { Request, Response } from 'express'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'

const router = express.Router()

const ALLOWED_STATUSES = new Set(['in_development', 'ideas', 'completed'])

// Get all projects (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { supabaseService } = getServices()
    const projects = await supabaseService.select(
      'projects', 
      'id, title, description, image, technologies, github_url, live_url, featured, date, created_at, updated_at, inspiration, images, status'
    )

    // Sort by featured first, then by created_at desc
    projects.sort((a, b) => {
      if (a.featured && !b.featured) return -1
      if (!a.featured && b.featured) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // Parse technologies from JSON string to array
    const parsedProjects = projects.map((project: any) => ({
      ...project,
      technologies: (() => {
        try {
          if (typeof project.technologies === 'string') {
            if (project.technologies.startsWith('[')) {
              return JSON.parse(project.technologies)
            }
            // Handle comma-separated string
            return project.technologies.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
          }
          return Array.isArray(project.technologies) ? project.technologies : []
        } catch {
          return []
        }
      })(),
      images: (() => {
        try {
          if (project.images == null) return []
          if (typeof project.images === 'string') return JSON.parse(project.images)
          return Array.isArray(project.images) ? project.images : []
        } catch {
          return []
        }
      })(),
      featured: Boolean(project.featured)
    }))

    res.json({
      success: true,
      data: parsedProjects
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    })
  }
})

// Get single project by ID (public)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { supabaseService } = getServices()
    
    const project = await supabaseService.selectOne(
      'projects', 
      id, 
      'id, title, description, content, inspiration, images, image, technologies, github_url, live_url, featured, date, created_at, updated_at, status'
    )

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }

    const parsedProject = {
      ...project,
      technologies: typeof project.technologies === 'string' 
        ? (project.technologies.startsWith('[') ? JSON.parse(project.technologies) : project.technologies.split(',').map((t: string) => t.trim()))
        : project.technologies || [],
      images: (() => {
        try {
          if (project.images == null) return []
          if (typeof project.images === 'string') return JSON.parse(project.images)
          return Array.isArray(project.images) ? project.images : []
        } catch {
          return []
        }
      })(),
      featured: Boolean(project.featured)
    }

    return res.json({
      success: true,
      data: parsedProject
    })
  } catch (error) {
    console.error('Get project error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Create project (admin only)
router.post('/', authenticate, authorize('admin'), [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('content').optional().isString(),
  body('inspiration').optional().isString(),
  body('images').optional().isArray(),
  body('status').optional().isIn(Array.from(ALLOWED_STATUSES))
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      })
    }

    const { title, description, content, inspiration, images, status, technologies, github_url, live_url, image, featured, date } = req.body
    const { supabaseService } = getServices()

    const newProject = await supabaseService.insert('projects', {
      title,
      description,
      content,
      inspiration,
      images: images || [],
      status: status || 'in_development',
      technologies: technologies || [],
      github_url,
      live_url,
      image,
      featured: featured || false,
      date
    })

    return res.status(201).json({
      success: true,
      data: {
        ...newProject,
        technologies: typeof newProject.technologies === 'string' 
          ? (newProject.technologies.startsWith('[') ? JSON.parse(newProject.technologies) : newProject.technologies.split(',').map((t: string) => t.trim()))
          : newProject.technologies || [],
        images: (() => {
          try {
            if (newProject.images == null) return []
            if (typeof newProject.images === 'string') return JSON.parse(newProject.images)
            return Array.isArray(newProject.images) ? newProject.images : []
          } catch {
            return []
          }
        })(),
        featured: Boolean(newProject.featured)
      }
    })
  } catch (error) {
    console.error('Create project error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Update project (admin only)
router.put('/:id', [
  authenticate,
  authorize('admin'),
  body('title').optional().isLength({ min: 1 }).trim(),
  body('description').optional().isLength({ min: 1 }).trim(),
  body('content').optional().isString(),
  body('inspiration').optional().isString(),
  body('images').optional().isArray(),
  body('status').optional().isIn(Array.from(ALLOWED_STATUSES)),
  body('image').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true
    return typeof value === 'string'
  }),
  body('image_url').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true
    return /^https?:\/\/.+/.test(value) || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(value)
  }),
  body('technologies').optional().isArray({ min: 1 }),
  body('github_url').optional().custom((value) => {
    if (value === null || value === '') return true
    return /^https?:\/\/.+/.test(value) || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(value)
  }),
  body('live_url').optional().custom((value) => {
    if (value === null || value === '') return true
    return /^https?:\/\/.+/.test(value) || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(value)
  }),
  body('featured').optional().isBoolean(),
  body('date').optional().isString()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.error('Project update validation errors:', errors.array())
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: errors.array()
      })
    }

    const { id } = req.params
    const updateData = req.body
    const { supabaseService } = getServices()

    // Check if project exists
    const existingProject = await supabaseService.getClient()
      .from('projects')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingProject || existingProject.error) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }

    // Prepare update payload
    const updatePayload: any = {}
    
    Object.keys(updateData).forEach(key => {
      // Skip id and undefined values
      if (key === 'id' || updateData[key] === undefined) {
        return
      }
      
      if (key === 'technologies') {
        // Ensure technologies is stored as JSON string
        updatePayload[key] = JSON.stringify(updateData[key])
      } else if (key === 'images') {
        updatePayload.images = JSON.stringify(updateData[key])
      } else if (key === 'image_url') {
        // Map image_url to image if provided (allow null/empty)
        updatePayload.image = updateData[key] || null
      } else if (key === 'image') {
        // Handle image field - allow null/empty values
        updatePayload.image = updateData[key] || null
      } else {
        // Include all other fields (allow null values for optional fields)
        updatePayload[key] = updateData[key]
      }
    })

    // Always update updated_at
    updatePayload.updated_at = new Date().toISOString()

    // Use Supabase client update method
    const updatedProject = await supabaseService.update('projects', id, updatePayload)

    return res.json({
      success: true,
      data: {
        ...updatedProject,
        technologies: (() => {
          try {
            if (updatedProject.technologies) {
              if (typeof updatedProject.technologies === 'string') {
                return JSON.parse(updatedProject.technologies)
              }
              return updatedProject.technologies
            }
            return []
          } catch {
            // If parsing fails, try to split by comma
            if (typeof updatedProject.technologies === 'string') {
              return updatedProject.technologies.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
            }
            return []
          }
        })(),
        images: (() => {
          try {
            if (updatedProject.images == null) return []
            if (typeof updatedProject.images === 'string') return JSON.parse(updatedProject.images)
            return Array.isArray(updatedProject.images) ? updatedProject.images : []
          } catch {
            return []
          }
        })(),
        featured: Boolean(updatedProject.featured)
      }
    })
  } catch (error) {
    console.error('Update project error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Delete project (admin only)
router.delete('/:id', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { supabaseService } = getServices()

    // Check if project exists and delete it
    const { data: deletedProject, error } = await supabaseService.getClient()
      .from('projects')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error || !deletedProject) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }

    return res.json({
      success: true,
      message: 'Project deleted successfully'
    })
  } catch (error) {
    console.error('Delete project error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

export default router
