import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { loadOrUnavailable } from '../load'
import { ApiUnavailableError } from '../api'
import RouteError from '@/components/RouteError'
import { ROUTE_ERRORS } from '../routeErrors'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }), usePathname: () => '/experience' }))

describe('API failures render inline instead of throwing (QA N-8)', () => {
  it('turns ApiUnavailableError into a value with a reference, and logs it', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await loadOrUnavailable(async () => {
      throw new ApiUnavailableError('down')
    })
    expect(result.ok).toBe(false)
    const reference = (result as { reference: string }).reference
    expect(reference).toMatch(/^[0-9a-f]{7}$/)
    expect(String(log.mock.calls[0][0])).toContain(`ERR ${reference}`)
  })

  it('passes data through and rethrows anything else', async () => {
    expect(await loadOrUnavailable(async () => 42)).toEqual({ ok: true, data: 42 })
    await expect(loadOrUnavailable(async () => Promise.reject(new TypeError('bug')))).rejects.toBeInstanceOf(TypeError)
  })

  it('RouteError shows the route title, Try again and the reference', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<RouteError {...ROUTE_ERRORS.experience} reference="4f2a91c" />)
    expect(screen.getByRole('heading', { level: 1, name: "Couldn't load experience" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByText('ERR 4f2a91c')).toBeInTheDocument()
  })
})
