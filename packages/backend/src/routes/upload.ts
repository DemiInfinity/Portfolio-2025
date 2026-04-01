import express from 'express'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'

const router = express.Router()

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-media'
const STORAGE_PREFIX = (process.env.SUPABASE_STORAGE_PREFIX || 'site').replace(/^\/+|\/+$/g, '')

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/avif': '.avif'
}

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10)
  }
})

function objectKey(): string {
  const suffix = crypto.randomBytes(8).toString('hex')
  return `${Date.now()}-${suffix}`
}

function extForMime(mimetype: string): string {
  return MIME_TO_EXT[mimetype] || ''
}

function isSafeStoragePath(p: string): boolean {
  if (!p || p.includes('..') || p.startsWith('/')) return false
  const normalized = p.replace(/\\/g, '/')
  return !normalized.split('/').some((seg) => seg === '..')
}

async function uploadBufferToSupabase(
  buffer: Buffer,
  mimetype: string
): Promise<{ publicUrl: string; path: string }> {
  const ext = extForMime(mimetype)
  if (!ext) {
    throw new Error(`Unsupported image type: ${mimetype}`)
  }

  const { supabaseService } = getServices()
  const client = supabaseService.getClient()
  const filename = `${objectKey()}${ext}`
  const storagePath = `${STORAGE_PREFIX}/${filename}`

  const { error } = await client.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: mimetype,
    upsert: false,
    cacheControl: '3600'
  })

  if (error) {
    console.error('Supabase storage upload error:', error.message)
    throw new Error(error.message || 'Storage upload failed')
  }

  const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(storagePath)
  const publicUrl = urlData.publicUrl
  if (!publicUrl) {
    throw new Error('Could not resolve public URL for uploaded object')
  }

  return {
    publicUrl,
    path: storagePath
  }
}

// Upload single image (admin only) → Supabase Storage public bucket
router.post('/image', authenticate, authorize('admin'), (req: Request, res: Response, next: NextFunction) => {
  const uploadMiddleware = memoryUpload.single('image')
  uploadMiddleware(req as any, res as any, async (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      return res.status(400).json({
        success: false,
        error: message
      })
    }

    try {
      const file = (req as any).file as Express.Multer.File | undefined
      if (!file?.buffer) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        })
      }

      const { publicUrl, path: storagePath } = await uploadBufferToSupabase(file.buffer, file.mimetype)

      return res.json({
        success: true,
        data: {
          filename: path.basename(storagePath),
          originalName: file.originalname,
          size: file.size,
          url: publicUrl,
          path: storagePath,
          bucket: BUCKET
        }
      })
    } catch (error) {
      console.error('Upload error:', error)
      const message = error instanceof Error ? error.message : 'Upload failed'
      return res.status(500).json({
        success: false,
        error: message
      })
    }
  })
})

// Upload multiple images (admin only)
router.post('/images', authenticate, authorize('admin'), (req: Request, res: Response, next: NextFunction) => {
  const uploadMiddleware = memoryUpload.array('images', 10)
  uploadMiddleware(req as any, res as any, async (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      return res.status(400).json({
        success: false,
        error: message
      })
    }

    try {
      const files = (req as any).files as Express.Multer.File[] | undefined
      if (!files?.length) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded'
        })
      }

      const uploadedFiles = []
      for (const file of files) {
        const { publicUrl, path: storagePath } = await uploadBufferToSupabase(file.buffer, file.mimetype)
        uploadedFiles.push({
          filename: path.basename(storagePath),
          originalName: file.originalname,
          size: file.size,
          url: publicUrl,
          path: storagePath,
          bucket: BUCKET
        })
      }

      return res.json({
        success: true,
        data: uploadedFiles
      })
    } catch (error) {
      console.error('Upload error:', error)
      const message = error instanceof Error ? error.message : 'Upload failed'
      return res.status(500).json({
        success: false,
        error: message
      })
    }
  })
})

// Delete object by storage path (path within bucket), e.g. site/123-abc.jpg
router.delete('/object', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const storagePath = typeof req.body?.path === 'string' ? req.body.path.trim() : ''
    if (!storagePath || !isSafeStoragePath(storagePath)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing path'
      })
    }

    const { supabaseService } = getServices()
    const { error } = await supabaseService.getClient().storage.from(BUCKET).remove([storagePath])

    if (error) {
      console.error('Supabase storage delete error:', error.message)
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete object'
      })
    }

    return res.json({
      success: true,
      message: 'File deleted successfully'
    })
  } catch (error) {
    console.error('Delete file error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    })
  }
})

// List recent objects under prefix (admin only)
router.get('/', authenticate, authorize('admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const { supabaseService } = getServices()
    const client = supabaseService.getClient()

    const { data: objects, error } = await client.storage.from(BUCKET).list(STORAGE_PREFIX, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' }
    })

    if (error) {
      console.error('Supabase storage list error:', error.message)
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to list files'
      })
    }

    const files = (objects || []).map((obj) => {
      const storagePath = `${STORAGE_PREFIX}/${obj.name}`
      const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(storagePath)
      return {
        filename: obj.name,
        path: storagePath,
        size: obj.metadata?.size,
        uploadDate: obj.created_at,
        url: urlData.publicUrl
      }
    })

    return res.json({
      success: true,
      data: files
    })
  } catch (error) {
    console.error('Get files error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get files'
    })
  }
})

export default router
