import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { bearerToken, toAuthUser } from '../middleware/auth'
import { rejectInvalid } from '../utils/validation'

const router = express.Router()

/**
 * A fresh, stateless Supabase client per call. Signing in (login, and the
 * current-password check in change-password) stores a session on the client,
 * so a shared client would carry one request's session into the next.
 */
function authClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

const invalidInput = rejectInvalid

export function registrationEnabled(): boolean {
  return process.env.ALLOW_REGISTRATION === 'true'
}

// Base route for auth status
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Supabase Auth service is running',
    endpoints: {
      login: 'POST /api/auth/login',
      logout: 'POST /api/auth/logout',
      refresh: 'POST /api/auth/refresh',
      me: 'GET /api/auth/me'
    }
  })
})

// Login with Supabase Auth
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req: Request, res: Response) => {
  try {
    if (invalidInput(req, res)) return

    const { email, password } = req.body
    const { data, error } = await authClient().auth.signInWithPassword({ email, password })

    if (error) {
      return res.status(401).json({ success: false, error: error.message })
    }

    if (!data.user || !data.session) {
      return res.status(401).json({ success: false, error: 'Authentication failed' })
    }

    return res.json({
      success: true,
      data: {
        user: toAuthUser(data.user),
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        }
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Public registration is closed. The site has one admin; set
// ALLOW_REGISTRATION=true only to create an account deliberately, then unset it.
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').isLength({ min: 2 })
], async (req: Request, res: Response) => {
  if (!registrationEnabled()) {
    return res.status(403).json({ success: false, error: 'Registration is disabled' })
  }

  try {
    if (invalidInput(req, res)) return

    const { email, password, name } = req.body

    // No role in user_metadata: users can edit their own user_metadata, so it
    // must not be what grants admin. Roles come from resolveRole().
    const { data, error } = await authClient().auth.signUp({
      email,
      password,
      options: { data: { name } }
    })

    if (error) {
      return res.status(400).json({ success: false, error: error.message })
    }

    return res.json({
      success: true,
      data: {
        user: data.user ? toAuthUser(data.user) : null,
        message: 'Registration successful. Please check your email for verification.'
      }
    })
  } catch (error) {
    console.error('Register error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    if (!bearerToken(req)) {
      return res.status(401).json({ success: false, error: 'No token provided' })
    }

    const { error } = await authClient().auth.signOut()

    if (error) {
      return res.status(400).json({ success: false, error: error.message })
    }

    return res.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Refresh token
router.post('/refresh', [
  body('refresh_token').notEmpty()
], async (req: Request, res: Response) => {
  try {
    if (invalidInput(req, res)) return

    const { refresh_token } = req.body
    const { data, error } = await authClient().auth.refreshSession({ refresh_token })

    if (error) {
      return res.status(401).json({ success: false, error: error.message })
    }

    if (!data.session) {
      return res.status(401).json({ success: false, error: 'Failed to refresh session' })
    }

    return res.json({
      success: true,
      data: {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        }
      }
    })
  } catch (error) {
    console.error('Refresh token error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Update user profile (the signed-in user's own name/email)
router.put('/profile', [
  body('name').optional().isLength({ min: 2 }).trim(),
  body('email').optional().isEmail().normalizeEmail()
], async (req: Request, res: Response) => {
  try {
    const token = bearerToken(req)
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' })
    }

    if (invalidInput(req, res)) return

    const { name, email } = req.body
    const client = authClient()

    const { data: userData, error: getUserError } = await client.auth.getUser(token)
    if (getUserError || !userData.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' })
    }

    const updateData: Record<string, any> = {}
    if (name) {
      // Only the name is written; role is never taken from this request.
      updateData.user_metadata = { ...userData.user.user_metadata, name }
    }
    if (email && email !== userData.user.email) {
      updateData.email = email
    }

    const { data: updatedUser, error: updateError } = await client.auth.admin.updateUserById(
      userData.user.id,
      updateData
    )

    if (updateError) {
      return res.status(400).json({ success: false, error: updateError.message })
    }

    return res.json({ success: true, data: { user: toAuthUser(updatedUser.user) } })
  } catch (error) {
    console.error('Update profile error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Change password. 401 only for a missing/invalid token; a wrong current
// password is a 400 so the admin shows a field error instead of logging out.
router.put('/change-password', [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req: Request, res: Response) => {
  try {
    const token = bearerToken(req)
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' })
    }

    if (invalidInput(req, res)) return

    const { currentPassword, newPassword } = req.body
    const client = authClient()

    const { data: userData, error: getUserError } = await client.auth.getUser(token)
    if (getUserError || !userData.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' })
    }

    // Verify the current password on a separate client so this sign-in
    // session never touches the client used for the update.
    const { error: signInError } = await authClient().auth.signInWithPassword({
      email: userData.user.email!,
      password: currentPassword
    })

    if (signInError) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' })
    }

    const { error: updateError } = await client.auth.admin.updateUserById(
      userData.user.id,
      { password: newPassword }
    )

    if (updateError) {
      return res.status(400).json({ success: false, error: updateError.message })
    }

    return res.json({ success: true, message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = bearerToken(req)
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' })
    }

    const { data, error } = await authClient().auth.getUser(token)

    if (error) {
      return res.status(401).json({ success: false, error: error.message })
    }

    if (!data.user) {
      return res.status(401).json({ success: false, error: 'User not found' })
    }

    return res.json({ success: true, data: { user: toAuthUser(data.user) } })
  } catch (error) {
    console.error('Get user error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
