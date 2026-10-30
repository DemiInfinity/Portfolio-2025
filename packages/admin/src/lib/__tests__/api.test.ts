import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { api, setUnauthorizedHandler } from '../api'

type Handler = { rejected: (e: unknown) => Promise<unknown> }
const reject = (api.interceptors.response as unknown as { handlers: Handler[] }).handlers[0].rejected

const err = (url: string, status: number) =>
  ({ config: { url } as InternalAxiosRequestConfig, response: { status } }) as unknown as AxiosError

describe('api 401 interceptor', () => {
  const handler = vi.fn()
  beforeEach(() => {
    handler.mockClear()
    setUnauthorizedHandler(handler)
    localStorage.setItem('auth_token', 't')
  })

  it('does not sign out or reload for a 401 from /auth/login', async () => {
    await expect(reject(err('/auth/login', 401))).rejects.toBeTruthy()
    expect(handler).not.toHaveBeenCalled()
    expect(localStorage.getItem('auth_token')).toBe('t')
  })

  it('clears the token and calls the auth handler for other 401s', async () => {
    await expect(reject(err('/projects', 401))).rejects.toBeTruthy()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('auth_token')).toBeNull()
  })

  it('leaves a 400 from change-password alone (H-8 point 3)', async () => {
    await expect(reject(err('/auth/change-password', 400))).rejects.toBeTruthy()
    expect(handler).not.toHaveBeenCalled()
  })
})
