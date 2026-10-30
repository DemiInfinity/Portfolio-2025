import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../useAuth'
import { api } from '@/lib/api'

// Mock the API module
vi.mock('@/lib/api', () => ({
  api: {
    defaults: {
      headers: {
        common: {}
      }
    },
    get: vi.fn(),
    post: vi.fn()
  },
  setUnauthorizedHandler: vi.fn()
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  it('should throw error when useAuth is used without AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')
  })

  it('should initialize with loading state and no user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    // Wait for initialization to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.user).toBe(null)
    })
  })

  it('should load user from token on mount', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin'
    }
    
    localStorageMock.getItem.mockReturnValue('test-token')
    ;(api.get as any).mockResolvedValue({
      data: { data: { user: mockUser } }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.user).toEqual(mockUser)
    })

    expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token')
    expect(api.defaults.headers.common.Authorization).toBe('Bearer test-token')
  })

  it('should handle missing token on mount', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.user).toBe(null)
    })

    expect(api.get).not.toHaveBeenCalled()
  })

  it('should handle API error on user fetch', async () => {
    localStorageMock.getItem.mockReturnValue('invalid-token')
    ;(api.get as any).mockRejectedValue(new Error('Invalid token'))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.user).toBe(null)
    })

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
    expect(api.defaults.headers.common.Authorization).toBeUndefined()
  })

  it('should login successfully', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin'
    }
    const mockSession = {
      access_token: 'new-token'
    }

    const mockLogin = (api.post as any)
    mockLogin.mockResolvedValue({
      data: { data: { user: mockUser, session: mockSession } }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.login('test@example.com', 'password')
    })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
    })

    expect(mockLogin).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password'
    })
    expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'new-token')
    expect(api.defaults.headers.common.Authorization).toBe('Bearer new-token')
  })

  it('should handle login failure', async () => {
    const error = new Error('Invalid credentials')
    ;(api.post as any).mockRejectedValue(error)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await expect(result.current.login('test@example.com', 'wrong-password'))
      .rejects.toThrow('Invalid credentials')
  })

  it('should handle invalid login response format', async () => {
    ;(api.post as any).mockResolvedValue({
      data: { data: { user: null } } // Missing session
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await expect(result.current.login('test@example.com', 'password'))
      .rejects.toThrow('Invalid response format')
  })

  it('should logout successfully', async () => {
    localStorageMock.getItem.mockReturnValue('test-token')
    ;(api.get as any).mockResolvedValue({
      data: { data: { user: { id: '1', email: 'test@example.com', name: 'Test', role: 'admin' } } }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).toBeTruthy()
    })

    await act(async () => {
      await result.current.logout()
    })

    await waitFor(() => {
      expect(result.current.user).toBe(null)
    })

    expect(api.post).toHaveBeenCalledWith('/auth/logout')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
    expect(api.defaults.headers.common.Authorization).toBeUndefined()
  })

  it('should handle logout API error', async () => {
    localStorageMock.getItem.mockReturnValue('test-token')
    ;(api.get as any).mockResolvedValue({
      data: { data: { user: { id: '1', email: 'test@example.com', name: 'Test', role: 'admin' } } }
    })
    ;(api.post as any).mockRejectedValue(new Error('Logout failed'))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).toBeTruthy()
    })

    await act(async () => {
      await result.current.logout()
    })

    await waitFor(() => {
      expect(result.current.user).toBe(null)
    })

    // Should still clear local state even if API call fails
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
    expect(api.defaults.headers.common.Authorization).toBeUndefined()
  })

  it('should refresh user', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin'
    }

    localStorageMock.getItem.mockReturnValue('test-token')
    ;(api.get as any).mockResolvedValue({
      data: { data: { user: mockUser } }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
    })

    // Mock a different user for refresh
    const updatedUser = { ...mockUser, name: 'Updated User' }
    ;(api.get as any).mockResolvedValue({
      data: { data: { user: updatedUser } }
    })

    await act(async () => {
      await result.current.refreshUser()
    })

    await waitFor(() => {
      expect(result.current.user).toEqual(updatedUser)
    })
  })
})
