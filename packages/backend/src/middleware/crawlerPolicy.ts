import { Request, Response, NextFunction } from 'express'

/**
 * The API must not be indexed by search engines or AI crawlers.
 * Applied first in both entry points (index.ts, vercel.ts), before helmet,
 * CORS, the rate limiter and any routing, so every response carries the
 * header (including errors and 404s) and robots.txt is never rate-limited.
 */
export const X_ROBOTS_TAG = 'noindex, nofollow, noarchive, nosnippet, noai, noimageai'
export const ROBOTS_TXT = 'User-agent: *\nDisallow: /\n'

export function noIndexHeader(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Robots-Tag', X_ROBOTS_TAG)
  next()
}

export function robotsTxt(req: Request, res: Response, next: NextFunction) {
  if ((req.method === 'GET' || req.method === 'HEAD') && req.path === '/robots.txt') {
    res.type('text/plain').set('Cache-Control', 'public, max-age=86400').send(ROBOTS_TXT)
    return
  }
  next()
}

export function applyCrawlerPolicy(app: { use: (...handlers: any[]) => unknown }) {
  app.use(noIndexHeader)
  app.use(robotsTxt)
}
