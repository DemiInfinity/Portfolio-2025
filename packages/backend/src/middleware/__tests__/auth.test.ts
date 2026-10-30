import { Request, Response, NextFunction } from 'express'
import { authenticate, authorize, AuthRequest, resolveRole, adminEmailAllowlist } from '../auth'
import { getServices } from '../../services'

// Mock services
jest.mock('../../services', () => ({
  getServices: jest.fn(),
}))

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let nextFunction: NextFunction

  beforeEach(() => {
    mockRequest = {
      headers: {},
    }
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    nextFunction = jest.fn()
  })

  describe('authenticate', () => {
    it('should return 401 if no token provided', async () => {
      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should return 401 if token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      }

      ;(getServices as jest.Mock).mockReturnValue({
        supabaseService: {
          getClient: jest.fn().mockReturnValue({
            auth: {
              getUser: jest.fn().mockResolvedValue({
                data: { user: null },
                error: { message: 'Invalid token' },
              }),
            },
          }),
        },
      })

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })

  describe('authorize', () => {
    it('should call next if user has required role', () => {
      ;(mockRequest as AuthRequest).user = {
        id: '1',
        email: 'admin@example.com',
        role: 'admin',
      } as any

      authorize('admin')(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(nextFunction).toHaveBeenCalled()
    })

    it('should return 403 if user does not have required role', () => {
      ;(mockRequest as AuthRequest).user = {
        id: '1',
        email: 'user@example.com',
        role: 'user',
      } as any

      authorize('admin')(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })
})


describe('resolveRole / ADMIN_EMAILS', () => {
  const original = process.env.ADMIN_EMAILS
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = original
  })

  it('keeps the existing default when ADMIN_EMAILS is unset: no metadata means admin', () => {
    delete process.env.ADMIN_EMAILS
    expect(resolveRole({ id: '1', email: 'owner@x.com' })).toBe('admin')
  })

  it('prefers app_metadata.role over user_metadata.role', () => {
    delete process.env.ADMIN_EMAILS
    expect(
      resolveRole({ id: '1', email: 'a@x.com', app_metadata: { role: 'viewer' }, user_metadata: { role: 'admin' } })
    ).toBe('viewer')
    expect(resolveRole({ id: '1', email: 'a@x.com', user_metadata: { role: 'viewer' } })).toBe('viewer')
  })

  it('makes anyone not on the allowlist a viewer, whatever their metadata says', () => {
    process.env.ADMIN_EMAILS = 'a@x.com'
    expect(resolveRole({ id: '2', email: 'b@x.com', user_metadata: { role: 'admin' } })).toBe('viewer')
    expect(resolveRole({ id: '2', email: 'b@x.com', app_metadata: { role: 'admin' } })).toBe('viewer')
    expect(resolveRole({ id: '3', email: '' })).toBe('viewer')
  })

  it('matches the allowlist case-insensitively and ignores spaces', () => {
    process.env.ADMIN_EMAILS = ' Owner@Example.com , other@x.com '
    expect(resolveRole({ id: '1', email: 'owner@example.COM' })).toBe('admin')
    expect(adminEmailAllowlist()).toEqual(['owner@example.com', 'other@x.com'])
  })

  it('an empty ADMIN_EMAILS behaves as unset', () => {
    process.env.ADMIN_EMAILS = ' , '
    expect(resolveRole({ id: '1', email: 'owner@x.com' })).toBe('admin')
  })
})
