import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  CONSENT_KEY,
  CONSENT_VERSION,
  LEGACY_OPT_OUT_KEY,
  VISIT_ID_KEY,
  readConsent,
  saveConsent,
  hasAnalyticsConsent,
  resetConsentMemory,
  openCookieSettings,
} from '../consent'
import ConsentManager, { CONSENT_COPY } from '@/components/consent/ConsentManager'
import { ToastProvider } from '@/components/ui/Toast'
import Footer from '@/components/Footer'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

const trackCalls = () =>
  (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(([url]) => String(url).includes('/analytics/track'))

async function freshAnalytics() {
  vi.resetModules()
  return (await import('../analytics')).default
}

function renderManager() {
  return render(
    <ToastProvider>
      <ConsentManager />
      <Footer />
    </ToastProvider>
  )
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  resetConsentMemory()
  global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any
  Object.defineProperty(navigator, 'globalPrivacyControl', { value: undefined, configurable: true })
  Object.defineProperty(navigator, 'doNotTrack', { value: null, configurable: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('analytics before consent', () => {
  it('sends nothing and stores no visit id', async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = 'true'
    const analytics = await freshAnalytics()
    analytics.trackPageView('/')
    await new Promise((r) => setTimeout(r, 40))
    expect(trackCalls()).toHaveLength(0)
    expect(window.localStorage.getItem(VISIT_ID_KEY)).toBeNull()
    delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED
  })

  it('withdrawing consent removes the visit id', () => {
    window.localStorage.setItem(VISIT_ID_KEY, JSON.stringify({ id: 'x', last: 1 }))
    window.sessionStorage.setItem(VISIT_ID_KEY, 'old')
    saveConsent({ analytics: false, prefs: false })
    expect(window.localStorage.getItem(VISIT_ID_KEY)).toBeNull()
    expect(window.sessionStorage.getItem(VISIT_ID_KEY)).toBeNull()
  })
})

describe('consent storage', () => {
  it('stores {v, analytics, prefs, at}', () => {
    saveConsent({ analytics: true, prefs: false })
    const stored = JSON.parse(window.localStorage.getItem(CONSENT_KEY)!)
    expect(stored).toMatchObject({ v: CONSENT_VERSION, analytics: true, prefs: false })
    expect(new Date(stored.at).toString()).not.toBe('Invalid Date')
  })

  it('migrates the old opt-out ("1") to a refusal and removes the old key', () => {
    window.localStorage.setItem(LEGACY_OPT_OUT_KEY, '1')
    expect(readConsent()).toMatchObject({ analytics: false, prefs: false })
    expect(window.localStorage.getItem(LEGACY_OPT_OUT_KEY)).toBeNull()
    expect(JSON.parse(window.localStorage.getItem(CONSENT_KEY)!).analytics).toBe(false)
  })

  it('any other old value is removed and the visitor is asked', () => {
    window.localStorage.setItem(LEGACY_OPT_OUT_KEY, '0')
    expect(readConsent()).toBeNull()
    expect(window.localStorage.getItem(LEGACY_OPT_OUT_KEY)).toBeNull()
  })

  it('ignores corrupt values and other versions (fails closed)', () => {
    window.localStorage.setItem(CONSENT_KEY, '{not json')
    expect(hasAnalyticsConsent()).toBe(false)
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ v: CONSENT_VERSION + 1, analytics: true, prefs: true, at: '' }))
    expect(readConsent()).toBeNull()
  })

  it('storage failure: reads fail closed, a choice still holds for the visit', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(hasAnalyticsConsent()).toBe(false)
    saveConsent({ analytics: true, prefs: false })
    expect(hasAnalyticsConsent()).toBe(true)
  })

  it('turning preferences off removes stored preferences', () => {
    window.localStorage.setItem('home_colourway', 'Rose')
    window.localStorage.setItem('post_sparkle:a', '1')
    saveConsent({ analytics: false, prefs: false })
    expect(window.localStorage.getItem('home_colourway')).toBeNull()
    expect(window.localStorage.getItem('post_sparkle:a')).toBeNull()
  })
})

describe('banner and settings', () => {
  it('shows the banner on a first visit with equal-weight choices', () => {
    renderManager()
    const banner = screen.getByRole('region', { name: CONSENT_COPY.bannerTitle })
    const no = within(banner).getByRole('button', { name: 'No thanks' })
    const yes = within(banner).getByRole('button', { name: 'Allow analytics' })
    expect(no.className.split(' ')).toContain('consent-btn')
    expect(yes.className.split(' ')).toContain('consent-btn')
    expect(screen.queryByText(CONSENT_COPY.gpcNote)).not.toBeInTheDocument()
  })

  it('Allow analytics saves consent, hides the banner and confirms', async () => {
    renderManager()
    await userEvent.click(screen.getByRole('button', { name: 'Allow analytics' }))
    expect(readConsent()).toMatchObject({ analytics: true, prefs: true })
    expect(screen.queryByRole('region', { name: CONSENT_COPY.bannerTitle })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(CONSENT_COPY.accepted)
  })

  it('No thanks refuses everything', async () => {
    renderManager()
    await userEvent.click(screen.getByRole('button', { name: 'No thanks' }))
    expect(readConsent()).toMatchObject({ analytics: false, prefs: false })
    expect(screen.getByRole('status')).toHaveTextContent(CONSENT_COPY.rejected)
  })

  it('Global Privacy Control: banner shows the note and settings default to off', async () => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true })
    renderManager()
    expect(screen.getByText(CONSENT_COPY.gpcNote)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Choose what’s allowed' }))
    const dialog = screen.getByRole('dialog', { name: 'Cookie settings' })
    expect(within(dialog).getByRole('switch', { name: 'Analytics' })).toHaveAttribute('aria-checked', 'false')
    expect(hasAnalyticsConsent()).toBe(false)
  })

  it('Do Not Track also shows the note', () => {
    Object.defineProperty(navigator, 'doNotTrack', { value: '1', configurable: true })
    renderManager()
    expect(screen.getByText(CONSENT_COPY.gpcNote)).toBeInTheDocument()
  })

  it('settings: turn analytics on and save', async () => {
    renderManager()
    await userEvent.click(screen.getByRole('button', { name: 'Choose what’s allowed' }))
    const dialog = screen.getByRole('dialog', { name: 'Cookie settings' })
    expect(within(dialog).getByRole('switch', { name: 'Essential, always on' })).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('switch', { name: 'Analytics' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save my choices' }))
    expect(readConsent()).toMatchObject({ analytics: true, prefs: false })
    expect(screen.getByRole('status')).toHaveTextContent(CONSENT_COPY.saved)
  })

  it('footer Cookie settings opens the dialog with the current state; no banner once chosen', async () => {
    saveConsent({ analytics: true, prefs: false })
    renderManager()
    expect(screen.queryByRole('region', { name: CONSENT_COPY.bannerTitle })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cookie settings' }))
    const dialog = screen.getByRole('dialog', { name: 'Cookie settings' })
    expect(within(dialog).getByRole('switch', { name: 'Analytics' })).toHaveAttribute('aria-checked', 'true')
    expect(within(dialog).getByRole('switch', { name: 'Preferences' })).toHaveAttribute('aria-checked', 'false')
  })

  it('openCookieSettings() works from anywhere', () => {
    saveConsent({ analytics: false, prefs: false })
    renderManager()
    act(() => openCookieSettings())
    expect(screen.getByRole('dialog', { name: 'Cookie settings' })).toBeInTheDocument()
  })
})
