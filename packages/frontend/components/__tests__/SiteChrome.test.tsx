import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import SiteChrome from '../SiteChrome'
import AnalyticsProvider from '../AnalyticsProvider'
import { matchesRoute, MAINTENANCE_EXEMPT } from '@/lib/routes'
import { resetConsentMemory, saveConsent } from '@/lib/consent'

const pathname = vi.hoisted(() => ({ value: '/' }))
const track = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }))
vi.mock('@/lib/analytics', () => ({ default: { trackPageView: track, reset: vi.fn() }, applyExcludeParam: vi.fn() }))

beforeEach(() => {
  track.mockClear()
  global.fetch = vi.fn()
})

describe('SiteChrome', () => {
  it('renders the skip link first, header, main and footer', () => {
    pathname.value = '/'
    const { container } = render(<SiteChrome>page</SiteChrome>)
    const first = container.querySelector('a')
    expect(first).toHaveTextContent('Skip to content')
    expect(first).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('renders /cv without site chrome', () => {
    pathname.value = '/cv'
    render(<SiteChrome>cv</SiteChrome>)
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(screen.getByText('cv')).toBeInTheDocument()
  })

  it('does not track /cv page views', () => {
    saveConsent({ analytics: true, prefs: false })
    pathname.value = '/cv'
    render(<AnalyticsProvider>x</AnalyticsProvider>)
    expect(track).not.toHaveBeenCalled()
    pathname.value = '/about'
    render(<AnalyticsProvider>x</AnalyticsProvider>)
    expect(track).toHaveBeenCalledWith('/about')
    window.localStorage.clear()
    resetConsentMemory()
  })

  it('keeps legal pages and the CV out of maintenance mode', () => {
    expect(matchesRoute('/cv', MAINTENANCE_EXEMPT)).toBe(true)
    expect(matchesRoute('/privacy', MAINTENANCE_EXEMPT)).toBe(true)
    expect(matchesRoute('/projects', MAINTENANCE_EXEMPT)).toBe(false)
  })
})
