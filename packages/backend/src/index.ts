import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import path from 'path'

// Load environment variables - try multiple locations
dotenv.config({ path: path.join(__dirname, '../.env') })
dotenv.config({ path: path.join(__dirname, '../.env.development') })
dotenv.config() // Also try default locations

console.log('🔍 Environment Check:')
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing')
console.log('NODE_ENV:', process.env.NODE_ENV)

import { initializeServices } from './services'
import { errorHandler } from './middleware/errorHandler'
import { notFound } from './middleware/notFound'

// Routes
import projectsRouter from './routes/projects'
import blogRouter from './routes/blog'
import learningRouter from './routes/learning'
import workHistoryRouter from './routes/workHistory'
import authRouter from './routes/supabase-auth'
import skillsRouter from './routes/skills'
import educationRoutes from './routes/education'
import certificationsRoutes from './routes/certifications'
import analyticsRoutes from './routes/analytics'
import featureFlagsRoutes from './routes/featureFlags'
import keepAliveRoutes from './routes/keepalive'
import uploadRoutes from './routes/upload'

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
dotenv.config({ path: envFile })
// Fallback to default .env if specific env file doesn't exist
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Trust proxy for Vercel deployment
app.set('trust proxy', 1)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

// CORS configuration
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}))
app.use(morgan('combined'))
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

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Portfolio API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      keepalive: '/api/keepalive',
      api: '/api/*'
    }
  })
})

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API Routes
app.use('/api/auth', authRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/learning', learningRouter)
app.use('/api/work-history', workHistoryRouter)
app.use('/api/blog', blogRouter)
app.use('/api/skills', skillsRouter)
app.use('/api/education', educationRoutes)
app.use('/api/certifications', certificationsRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/feature-flags', featureFlagsRoutes)
app.use('/api/keepalive', keepAliveRoutes)
app.use('/api/upload', uploadRoutes)

// Error handling
app.use(notFound)
app.use(errorHandler)

// Start server first, then initialize database
async function startServer() {
  // Start the HTTP server first
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`)
  })

  // Initialize Supabase services in background
  try {
    await initializeServices()
    console.log('✅ Supabase services initialized successfully')
  } catch (error) {
    console.error('❌ Supabase service initialization failed:', error)
    console.log('⚠️  Server running without Supabase connection')
  }
}

startServer()

export default app
