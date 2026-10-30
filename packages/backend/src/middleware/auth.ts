import { Request, Response, NextFunction } from 'express'
import { getServices } from '../services'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

export interface AuthRequest extends Request {
  user?: AuthUser
}

interface SupabaseUserLike {
  id: string
  email?: string | null
  user_metadata?: Record<string, any> | null
  app_metadata?: Record<string, any> | null
}

/** Parses the optional `ADMIN_EMAILS` allowlist (comma separated, case-insensitive). */
export function adminEmailAllowlist(raw: string | undefined = process.env.ADMIN_EMAILS): string[] {
  return String(raw || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * The role used for authorisation.
 *
 * - If `ADMIN_EMAILS` is set, any user whose email is not on it is a `viewer`
 *   (403 on every admin route), whatever their metadata says.
 * - Otherwise: `app_metadata.role` (only settable with the service role), then
 *   `user_metadata.role`, then `'admin'`. The `'admin'` fallback keeps the
 *   owner's existing account working; set `ADMIN_EMAILS` (or disable sign-ups
 *   in Supabase) so a stranger's account can't reach admin routes.
 */
export function resolveRole(user: SupabaseUserLike): string {
  const allow = adminEmailAllowlist()
  if (allow.length > 0) {
    const email = String(user.email || '').trim().toLowerCase()
    if (!email || !allow.includes(email)) return 'viewer'
  }
  return user.app_metadata?.role || user.user_metadata?.role || 'admin'
}

/** The public shape of a user in auth responses. */
export function toAuthUser(user: SupabaseUserLike): AuthUser {
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || user.email || '',
    role: resolveRole(user)
  }
}

export function bearerToken(req: Request): string | null {
  const header = req.header('Authorization') || ''
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1].trim() : null
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = bearerToken(req)

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      })
    }

    const { supabaseService } = getServices()
    const { data, error } = await supabaseService.getClient().auth.getUser(token)

    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token.'
      })
    }

    req.user = toAuthUser(data.user)
    return next()
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Invalid token.'
    })
  }
}

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Please authenticate.'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.'
      })
    }

    return next()
  }
}
