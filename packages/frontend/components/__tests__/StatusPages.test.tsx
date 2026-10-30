import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import ErrorView from '../ErrorView'
import NotFoundView from '../NotFoundView'
import MaintenancePage from '../MaintenancePage'
import SiteChrome from '../SiteChrome'
import GlobalError from '@/app/global-error'
import { OverlayProvider } from '../overlays/OverlayProvider'
import { ToastProvider } from '../ui/Toast'
import { resetConsentMemory } from '@/lib/consent'

const pathname = vi.hoisted(() => ({ value: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }))

const wrap = (ui: ReactNode) =>
  render(
    <ToastProvider>
      <OverlayProvider>{ui}</OverlayProvider>
    </ToastProvider>
  )

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  window.localStorage.clear()
  resetConsentMemory()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any
})

describe('500', () => {
  it('shows the design copy and the digest as the reference', () => {
    wrap(<ErrorView error={Object.assign(new Error('x'), { digest: '4f2a91c' })} reset={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Something broke')
    expect(screen.getByText('ERR 4f2a91c')).toBeInTheDocument()
  })

  it('hides the reference without a digest', () => {
    wrap(<ErrorView error={new Error('x')} reset={() => {}} />)
    expect(screen.queryByText(/ERR /)).not.toBeInTheDocument()
    expect(screen.queryByText(/quote this reference/)).not.toBeInTheDocument()
  })

  it('Try again prefers retry() and falls back to reset()', async () => {
    const retry = vi.fn()
    const reset = vi.fn()
    const { unmount } = wrap(<ErrorView error={new Error('x')} retry={retry} reset={reset} />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalled()
    expect(reset).not.toHaveBeenCalled()
    unmount()
    wrap(<ErrorView error={new Error('x')} reset={reset} />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalled()
  })

  it('route-level titles are kept, and Let me know opens contact', async () => {
    wrap(<ErrorView error={new Error('x')} reset={() => {}} title="Couldn't load projects" />)
    expect(screen.getByRole('heading', { level: 1, name: "Couldn't load projects" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Let me know' }))
    expect(screen.getByRole('dialog', { name: 'Let’s build something' })).toBeInTheDocument()
  })

  it('outside the site chrome (bare /cv) Let me know is a mailto link', () => {
    render(<ErrorView error={new Error('x')} reset={() => {}} />)
    expect(screen.getByRole('link', { name: 'Let me know' })).toHaveAttribute('href', 'mailto:demi.21@outlook.com')
  })

  it('global-error renders a minimal standalone page with the reference', () => {
    const retry = vi.fn()
    render(<GlobalError error={Object.assign(new Error('x'), { digest: 'abc123' })} retry={retry} />, { container: document.documentElement })
    expect(screen.getByRole('heading', { name: 'Something broke' })).toBeInTheDocument()
    expect(screen.getByText('ERR abc123')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Try again' }).click()
    expect(retry).toHaveBeenCalled()
  })
})

describe('404', () => {
  it('links home and to the four popular pages', async () => {
    wrap(<NotFoundView />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('This page took a wrong turn')
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
    const nav = screen.getByRole('navigation', { name: 'Popular pages' })
    expect(within(nav).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/projects', '/experience', '/about', '/blog'])
    await userEvent.click(screen.getByRole('button', { name: 'Tell me what you were after' }))
    expect(screen.getByRole('dialog', { name: 'Let’s build something' })).toBeInTheDocument()
  })
})

describe('Maintenance', () => {
  it('shows the design copy and the exempt links', () => {
    render(<MaintenancePage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Back soon')
    expect(screen.getByText('Maintenance in progress')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'view the CV' })).toHaveAttribute('href', '/cv')
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
  })

  it('has no consent banner', () => {
    render(<MaintenancePage />)
    expect(screen.queryByRole('region', { name: 'Can I count your visit?' })).not.toBeInTheDocument()
  })
})

describe('consent banner placement', () => {
  it('appears on normal pages and not on /cv', () => {
    pathname.value = '/'
    const { unmount } = render(<SiteChrome>page</SiteChrome>)
    expect(screen.getByRole('region', { name: 'Can I count your visit?' })).toBeInTheDocument()
    unmount()
    pathname.value = '/cv'
    render(<SiteChrome>cv</SiteChrome>)
    expect(screen.queryByRole('region', { name: 'Can I count your visit?' })).not.toBeInTheDocument()
  })
})
