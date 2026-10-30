import axios from 'axios'
import { API_ORIGIN } from './config'

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  timeout: 10000,
})

let onUnauthorized: (() => void) | null = null

/** The auth context registers how a 401 signs the user out (no page reload). */
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn
}

// Paths whose 401 is handled by the caller (a wrong password on sign in, or the auth calls themselves).
const SELF_HANDLED = /\/auth\/(login|logout|me)$/

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url || ''
    if (error.response?.status === 401 && !SELF_HANDLED.test(url)) {
      localStorage.removeItem('auth_token')
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)
