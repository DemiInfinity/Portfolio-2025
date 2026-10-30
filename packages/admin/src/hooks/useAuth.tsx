import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { api, setUnauthorizedHandler } from '@/lib/api'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        const response = await api.get('/auth/me')
        if (response.data?.data?.user) {
          setUser(response.data.data.user)
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      localStorage.removeItem('auth_token')
      delete api.defaults.headers.common['Authorization']
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  // A 401 on any admin call (expired or invalid token) signs out in place, without a reload.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      delete api.defaults.headers.common['Authorization']
      setUser(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const data = response.data?.data
      
      if (!data?.user || !data?.session) {
        throw new Error('Invalid response format')
      }
      
      // Store token locally
      localStorage.setItem('auth_token', data.session.access_token)
      
      // Set token for API calls
      api.defaults.headers.common['Authorization'] = `Bearer ${data.session.access_token}`
      setUser(data.user)
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      // Call our backend logout endpoint
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Always clear local state
      localStorage.removeItem('auth_token')
      delete api.defaults.headers.common['Authorization']
      setUser(null)
    }
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
