import express from 'express'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getServices } from '../services'
import { getBuildRow, kickIfOverdue, publicPdfUrl } from '../services/cvBuild'
import { CV_FILE_NAME } from '../services/cvPdf'

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

// Always stored at a fixed path (not a randomly-named object like images
// above) so re-uploading replaces it in place and the public download URL
// never changes.
const RESUME_STORAGE_PATH = `${STORAGE_PREFIX}/resume.pdf`

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are allowed'))
    }
  },
  limits: {
    fileSize: parseInt(process.env.MAX_RESUME_SIZE || '10485760', 10) // 10MB
  }
})

const RESUME_FALLBACK_NAME = 'Demi-Taylor-Nimmo-CV.pdf'

// DEPRECATED (H-21): the CV PDF is generated automatically; an uploaded file is
// no longer served by GET /upload/resume. Kept for one release.
// Upload/replace the resume/CV PDF (admin only)
router.post('/resume', authenticate, authorize('admin'), (req: Request, res: Response, next: NextFunction) => {
  const uploadMiddleware = resumeUpload.single('resume')
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

      const { supabaseService } = getServices()
      const client = supabaseService.getClient()
      const { error } = await client.storage.from(BUCKET).upload(RESUME_STORAGE_PATH, file.buffer, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '3600',
        metadata: { originalName: file.originalname }
      })

      if (error) {
        console.error('Supabase resume upload error:', error.message)
        return res.status(500).json({
          success: false,
          error: error.message || 'Storage upload failed'
        })
      }

      const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(RESUME_STORAGE_PATH)

      return res.json({
        success: true,
        data: {
          url: urlData.publicUrl,
          path: RESUME_STORAGE_PATH,
          bucket: BUCKET,
          originalName: file.originalname,
          name: file.originalname || RESUME_FALLBACK_NAME,
          size: file.size,
          updatedAt: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Resume upload error:', error)
      const message = error instanceof Error ? error.message : 'Upload failed'
      return res.status(500).json({
        success: false,
        error: message
      })
    }
  })
})

// Download CV status (public, un-enveloped; H-15 shape). Since H-21 this
// describes the generated CV PDF, not an uploaded file. Fails closed: any
// problem reports `available:false` rather than 500ing the page.
router.get('/resume', async (_req: Request, res: Response) => {
  const unavailable = { success: true, available: false, url: null }
  try {
    const row = await getBuildRow()
    kickIfOverdue(row)
    if (!row?.generated_at || !row.pdf_path) return res.json(unavailable)

    const client = getServices().supabaseService.getClient()
    const dir = row.pdf_path.split('/').slice(0, -1).join('/')
    const file = row.pdf_path.split('/').pop() as string
    const { data: objects, error } = await client.storage.from(BUCKET).list(dir, { search: file })
    if (error || !objects?.some((o) => o.name === file)) return res.json(unavailable)

    return res.json({
      success: true,
      available: true,
      url: publicPdfUrl(row),
      path: row.pdf_path,
      name: CV_FILE_NAME,
      size: row.size_bytes ?? null,
      updatedAt: new Date(row.generated_at).toISOString()
    })
  } catch (error) {
    console.error('Check resume availability error:', error)
    return res.json(unavailable)
  }
})

// DEPRECATED (H-21): removes the manually uploaded resume. 200 even if absent.
router.delete('/resume', authenticate, authorize('admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const { error } = await getServices().supabaseService.getClient().storage.from(BUCKET).remove([RESUME_STORAGE_PATH])
    if (error) {
      console.error('Supabase resume delete error:', error.message)
      return res.status(500).json({ success: false, error: error.message || 'Failed to remove CV' })
    }
    return res.json({ success: true, message: 'CV removed' })
  } catch (error) {
    console.error('Delete resume error:', error)
    return res.status(500).json({ success: false, error: 'Failed to remove CV' })
  }
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
