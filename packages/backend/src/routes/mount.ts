import { Router } from 'express'

import projectsRouter from './projects'
import blogRouter from './blog'
import learningRouter from './learning'
import workHistoryRouter from './workHistory'
import authRouter from './supabase-auth'
import skillsRouter from './skills'
import educationRoutes from './education'
import certificationsRoutes from './certifications'
import analyticsRoutes from './analytics'
import featureFlagsRoutes from './featureFlags'
import keepAliveRoutes from './keepalive'
import uploadRoutes from './upload'
import contactRoutes from './contact'
import cvRoutes from './cv'
import contentRoutes from './content'
import recommendationsRoutes from './recommendations'

/**
 * Every API router, mounted under `/api` by both entry points (`index.ts` for
 * local dev, `vercel.ts` for production). Add new routers here only, so the
 * two can't drift apart.
 */
export const API_ROUTES: [string, Router][] = [
  ['/auth', authRouter],
  ['/projects', projectsRouter],
  ['/learning', learningRouter],
  ['/work-history', workHistoryRouter],
  ['/blog', blogRouter],
  ['/skills', skillsRouter],
  ['/education', educationRoutes],
  ['/certifications', certificationsRoutes],
  ['/analytics', analyticsRoutes],
  ['/feature-flags', featureFlagsRoutes],
  ['/keepalive', keepAliveRoutes],
  ['/upload', uploadRoutes],
  ['/contact', contactRoutes],
  ['/cv', cvRoutes],
  ['/content', contentRoutes],
  ['/recommendations', recommendationsRoutes]
]

export function mountApiRoutes(app: { use: (path: string, router: Router) => unknown }, prefix = '/api') {
  for (const [path, router] of API_ROUTES) app.use(`${prefix}${path}`, router)
}
