import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'

import { initializeServices } from './services'
import { errorHandler } from './middleware/errorHandler'
import { notFound } from './middleware/notFound'

import { mountApiRoutes } from './routes/mount'
import { applyCrawlerPolicy } from './middleware/crawlerPolicy'

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
dotenv.config({ path: envFile })
// Fallback to default .env if specific env file doesn't exist
dotenv.config()

const app = express()

// Trust proxy for Vercel deployment (required for rate limiting)
app.set('trust proxy', 1)

// Not indexable: X-Robots-Tag on every response and robots.txt, before
// everything else (no rate limit, no Supabase init).
applyCrawlerPolicy(app)

// Rate limiting (more lenient for serverless)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs for serverless
  message: 'Too many requests from this IP, please try again later.'
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.ADMIN_URL || 'http://localhost:3002',
    // Add your custom domains
    'https://demitaylornimmo.com',
    'https://www.demitaylornimmo.com',
    'https://admin.demitaylornimmo.com',
    'https://api.demitaylornimmo.com',
    // Add Vercel preview URLs
    /^https:\/\/.*\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}))

// Only use morgan in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('combined'))
}

// Handle favicon.ico requests very early (before body parsing)
app.use('/favicon.ico', (req, res) => {
  res.status(204).end()
})

app.use(limiter)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Also handle as a GET route
app.get('/favicon.ico', (req, res) => {
  res.status(204).end()
})

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Portfolio API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      keepalive: '/api/keepalive',
      api: '/api/*'
    }
  })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    api_url: process.env.API_URL || 'localhost'
  })
})

// Initialize Supabase services for serverless
let supabaseInitialized = false

async function ensureSupabaseInitialized() {
  if (!supabaseInitialized) {
    try {
      await initializeServices()
      supabaseInitialized = true
      console.log('✅ Supabase services initialized for serverless function')
    } catch (error) {
      console.error('❌ Supabase service initialization failed:', error)
      throw error
    }
  }
}

// Middleware to ensure Supabase services are initialized (skip for health check and root)
app.use(async (req, res, next) => {
  // Skip Supabase initialization for health check, root route, and favicon
  if (req.path === '/api/health' || req.path === '/' || req.path === '/favicon.ico') {
    return next()
  }
  
  // Keep-alive endpoint needs Supabase, so ensure it's initialized
  try {
    await ensureSupabaseInitialized()
    next()
  } catch (error) {
    console.error('Supabase service initialization error:', error)
    // For keepalive endpoint, return a more informative error
    if (req.path === '/api/keepalive') {
      return res.status(500).json({ 
        success: false,
        error: 'Supabase service initialization failed',
        timestamp: new Date().toISOString()
      })
    }
    res.status(500).json({ error: 'Supabase service initialization failed' })
  }
})

// API Routes (one list for both entry points: src/routes/mount.ts)
mountApiRoutes(app)

// Error handling
app.use(notFound)
app.use(errorHandler)

export default app
