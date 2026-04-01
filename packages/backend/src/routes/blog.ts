import express from 'express'
import { body, validationResult } from 'express-validator'
import { Request, Response } from 'express'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'

const router = express.Router()

// Get all published blog posts (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search, limit = 10, offset = 0 } = req.query

    const { supabaseService } = getServices()
    
    let query = supabaseService.getClient()
      .from('blog_posts')
      .select('id, title, slug, excerpt, created_at, category, tags, featured, author, read_time, cover_image')
      .eq('published', true)

    // Add category filter
    if (category) {
      query = query.eq('category', category as string)
    }

    // Add search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`)
    }

    // Add ordering and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    const { data: posts, error } = await query
    if (error) throw error

    const parsedPosts = posts.map((post: any) => {
      let tags = []
      try {
        if (post.tags) {
          // Try to parse as JSON first
          tags = JSON.parse(post.tags)
        }
      } catch (error) {
        // If JSON parsing fails, treat as comma-separated string
        if (typeof post.tags === 'string') {
          tags = post.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
        }
      }
      
      return {
        ...post,
        tags,
        featured: Boolean(post.featured),
        publish_date: post.created_at
      }
    })

    return res.json({
      success: true,
      data: parsedPosts
    })
  } catch (error) {
    console.error('Get blog posts error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Get single blog post by slug (public)
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const { supabaseService } = getServices()
    
    const { data: post, error } = await supabaseService.getClient()
      .from('blog_posts')
      .select('id, title, slug, excerpt, content, author, read_time, created_at, category, tags, featured, cover_image')
      .eq('slug', slug)
      .eq('published', true)
      .single()
    
    if (error) throw error

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      })
    }

    let tags = []
    try {
      if (post.tags) {
        // Try to parse as JSON first
        tags = JSON.parse(post.tags)
      }
    } catch (error) {
      // If JSON parsing fails, treat as comma-separated string
      if (typeof post.tags === 'string') {
        tags = post.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
      }
    }

    const parsedPost = {
      ...post,
      tags,
      featured: Boolean(post.featured),
      publish_date: post.created_at
    }

    return res.json({
      success: true,
      data: parsedPost
    })
  } catch (error) {
    console.error('Get blog post error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Get all blog posts for admin (admin only)
router.get('/admin/all', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const { supabaseService } = getServices()
    
    const { data: posts, error } = await supabaseService.getClient()
      .from('blog_posts')
      .select('id, title, slug, excerpt, content, author, read_time, created_at, category, tags, featured, published, cover_image')
      .order('created_at', { ascending: false })
    
    if (error) throw error

    const parsedPosts = posts.map((post: any) => {
      let tags = []
      try {
        if (post.tags) {
          // Try to parse as JSON first
          tags = JSON.parse(post.tags)
        }
      } catch (error) {
        // If JSON parsing fails, treat as comma-separated string
        if (typeof post.tags === 'string') {
          tags = post.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
        }
      }
      
      return {
        ...post,
        tags,
        featured: Boolean(post.featured),
        published: Boolean(post.published),
        publish_date: post.created_at
      }
    })

    return res.json({
      success: true,
      data: parsedPosts
    })
  } catch (error) {
    console.error('Get all blog posts error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Create blog post (admin only)
router.post('/', [
  authenticate,
  authorize('admin'),
  body('title').isLength({ min: 1 }).trim(),
  body('excerpt').isLength({ min: 1 }).trim(),
  body('content').isLength({ min: 1 }).trim(),
  body('category').isLength({ min: 1 }).trim(),
  body('tags').isArray({ min: 1 }),
  body('featured').optional().isBoolean(),
  body('published').optional().isBoolean(),
  body('cover_image').optional().isString()
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

    const { title, excerpt, content, category, tags, featured = false, published = false, author, read_time, publish_date, cover_image } = req.body

    const { supabaseService } = getServices()
    // Create slug from title
    let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    
    // Check if slug already exists and generate unique slug
    let uniqueSlug = slug
    let counter = 1
    while (true) {
      try {
        const { data } = await supabaseService.getClient()
          .from('blog_posts')
          .select('id')
          .eq('slug', uniqueSlug)
          .single()
        
        // If we get here, slug exists, try next one
        if (data) {
          uniqueSlug = `${slug}-${counter}`
          counter++
        } else {
          // Slug doesn't exist, we can use it
          break
        }
      } catch (error) {
        // Slug doesn't exist (error means no match found), we can use it
        break
      }
    }

    // Insert new blog post
    const insertData: any = {
      title,
      slug: uniqueSlug,
      excerpt,
      content,
      category,
      tags,
      featured,
      published
    }

    // Add optional fields if provided
    if (author) insertData.author = author
    if (read_time) insertData.read_time = read_time
    if (cover_image !== undefined && cover_image !== null && cover_image !== '') {
      insertData.cover_image = cover_image
    }
    if (publish_date) {
      // Use created_at as the publish date (publish_date column may not exist)
      insertData.created_at = publish_date
    }

    const newPost = await supabaseService.insert('blog_posts', insertData)

    return res.status(201).json({
      success: true,
      data: {
        ...newPost,
        tags: (() => {
          try {
            if (newPost.tags) {
              return JSON.parse(newPost.tags)
            }
            return []
          } catch (error) {
            if (typeof newPost.tags === 'string') {
              return newPost.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
            }
            return []
          }
        })(),
        featured: Boolean(newPost.featured),
        published: Boolean(newPost.published)
      }
    })
  } catch (error) {
    console.error('Create blog post error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Update blog post by ID (admin only)
router.put('/:id', [
  authenticate,
  authorize('admin'),
  body('title').optional().isLength({ min: 1 }).trim(),
  body('excerpt').optional().isLength({ min: 1 }).trim(),
  body('content').optional().isLength({ min: 1 }).trim(),
  body('category').optional().isLength({ min: 1 }).trim(),
  body('tags').optional().isArray({ min: 1 }),
  body('featured').optional().isBoolean(),
  body('published').optional().isBoolean(),
  body('cover_image').optional().isString()
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

    // Check if post exists
    let existingPost
    try {
      existingPost = await supabaseService.selectOne('blog_posts', id)
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      })
    }

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      })
    }

    // Check slug uniqueness if slug is being updated
    if (updateData.slug && updateData.slug !== existingPost.slug) {
      try {
        const { data: slugCheck } = await supabaseService.getClient()
          .from('blog_posts')
          .select('id')
          .eq('slug', updateData.slug)
          .neq('id', id)
          .single()
        
        if (slugCheck) {
          return res.status(400).json({
            success: false,
            error: 'Slug already exists. Please choose a different slug.'
          })
        }
      } catch (error) {
        // Slug doesn't exist, which is good - continue
      }
    }

    // Prepare update data
    const updatePayload: any = {}
    
    Object.keys(updateData).forEach(key => {
      if (key === 'tags') {
        // Stringify tags array
        updatePayload[key] = JSON.stringify(updateData[key])
      } else if (key === 'publish_date') {
        // Handle publish_date - only update created_at since publish_date column may not exist
        // Use created_at as the publish date
        updatePayload.created_at = updateData[key]
      } else if (key === 'cover_image') {
        const v = updateData[key]
        updatePayload.cover_image = v === '' || v === undefined ? null : v
      } else {
        updatePayload[key] = updateData[key]
      }
    })

    // Add updated_at timestamp
    updatePayload.updated_at = new Date().toISOString()

    // Update the post using Supabase client method
    const updatedPost = await supabaseService.update('blog_posts', id, updatePayload)

    return res.json({
      success: true,
      data: {
        ...updatedPost,
        tags: (() => {
          try {
            if (updatedPost.tags) {
              return JSON.parse(updatedPost.tags)
            }
            return []
          } catch (error) {
            if (typeof updatedPost.tags === 'string') {
              return updatedPost.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
            }
            return []
          }
        })(),
        featured: Boolean(updatedPost.featured),
        published: Boolean(updatedPost.published)
      }
    })
  } catch (error) {
    console.error('Update blog post error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Delete blog post (admin only)
router.delete('/:id', [authenticate, authorize('admin')], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { supabaseService } = getServices()

    // Check if post exists and delete it
    const { data: deletedPost, error } = await supabaseService.getClient()
      .from('blog_posts')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error || !deletedPost) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      })
    }

    return res.json({
      success: true,
      message: 'Blog post deleted successfully'
    })
  } catch (error) {
    console.error('Delete blog post error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

export default router
