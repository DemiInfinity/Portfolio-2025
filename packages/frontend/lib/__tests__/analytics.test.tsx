import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { Analytics, EXCLUDE_ME_KEY, SESSION_TIMEOUT_MS, applyExcludeParam, trackingEnvironmentAllowed } from '../analytics'
import { VISIT_ID_KEY, resetConsentMemory, saveConsent } from '../consent'

const pathname = vi.hoisted(() => ({ value: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }))

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const instances: Analytics[] = []
class TestAnalytics extends Analytics {
  constructor(clockFn: () => number) {
    super(clockFn)
    instances.push(this)
  }
}

let clock = 1_000_000
const now = () => clock
const tick = (ms: number) => {
  clock += ms
}
/** page_view goes out one frame + a macrotask later. */
const frame = () => new Promise((r) => setTimeout(r, 40))

function sent(): any[] {
  return (global.fetch as any).mock.calls.filter(([u]: [string]) => String(u).includes('/analytics/track')).map(([, init]: [string, RequestInit]) => JSON.parse(String(init.body)))
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = 'true'
  window.localStorage.clear()
  window.sessionStorage.clear()
  resetConsentMemory()
  clock = 1_000_000
  Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true, writable: true })
  global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any
  window.history.replaceState(null, '', '/')
  Object.defineProperty(document, 'referrer', { value: '', configurable: true })
})

afterEach(() => {
  delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED
  instances.splice(0).forEach((a) => a.dispose())
})

describe('page views (H-23)', () => {
  it('sends nothing before consent', async () => {
    const a = new TestAnalytics(now)
    a.trackPageView('/')
    await frame()
    expect(sent()).toHaveLength(0)
    expect(window.localStorage.getItem(VISIT_ID_KEY)).toBeNull()
  })

  it('page_view with its own view_id and the visit id', async () => {
    saveConsent({ analytics: true, prefs: false })
    document.title = 'Projects | Demi Taylor Nimmo'
    const a = new TestAnalytics(now)
    a.trackPageView('/projects')
    await frame()
    const [view] = sent()
    expect(view).toMatchObject({ event: 'page_view', page_path: '/projects', page_title: 'Projects | Demi Taylor Nimmo' })
    expect(view.view_id).toMatch(UUID)
    expect(view.session_id).toBe(JSON.parse(window.localStorage.getItem(VISIT_ID_KEY)!).id)
  })

  it('no double counting for the same view (Strict Mode double effect, re-renders)', async () => {
    saveConsent({ analytics: true, prefs: false })
    const a = new TestAnalytics(now)
    a.trackPageView('/')
    a.trackPageView('/')
    await frame()
    a.trackPageView('/')
    await frame()
    expect(sent().filter((p) => p.event === 'page_view')).toHaveLength(1)
  })

  it('leaving a page sends that view’s own final time; the next view gets a new id', async () => {
    saveConsent({ analytics: true, prefs: false })
    const a = new TestAnalytics(now)
    a.trackPageView('/a')
    await frame()
    tick(40_000)
    a.trackPageView('/b')
    await frame()
    const [viewA, updateA, viewB] = sent()
    expect(updateA).toMatchObject({ event: 'view_update', view_id: viewA.view_id, page_path: '/a', duration_seconds: 40 })
    expect(viewB.view_id).not.toBe(viewA.view_id)
    expect(viewB.session_id).toBe(viewA.session_id)
  })

  it('tab switches pause and resume the same view, sending running totals', async () => {
    saveConsent({ analytics: true, prefs: false })
    const a = new TestAnalytics(now)
    a.trackPageView('/a')
    await frame()
    const id = sent()[0].view_id
    tick(20_000)
    setHidden(true)
    tick(3_600_000) // an hour away does not count
    setHidden(false)
    tick(10_000)
    window.dispatchEvent(new Event('pagehide'))
    const updates = sent().filter((p) => p.event === 'view_update')
    expect(updates.map((u) => [u.view_id, u.duration_seconds])).toEqual([
      [id, 20],
      [id, 30],
    ])
  })

  it('back/forward cache restore resumes the same view', async () => {
    saveConsent({ analytics: true, prefs: false })
    const a = new TestAnalytics(now)
    a.trackPageView('/a')
    await frame()
    tick(5_000)
    window.dispatchEvent(new Event('pagehide'))
    tick(60_000)
    const show = new Event('pageshow') as PageTransitionEvent
    Object.defineProperty(show, 'persisted', { value: true })
    window.dispatchEvent(show)
    tick(7_000)
    setHidden(true)
    const updates = sent().filter((p) => p.event === 'view_update')
    expect(updates.map((u) => u.duration_seconds)).toEqual([5, 12])
    expect(new Set(updates.map((u) => u.view_id)).size).toBe(1)
  })
})

describe('visits (sessions)', () => {
  it('keeps the visit across views, starts a new one after 30 minutes idle', async () => {
    saveConsent({ analytics: true, prefs: false })
    const a = new TestAnalytics(now)
    a.trackPageView('/a')
    await frame()
    tick(SESSION_TIMEOUT_MS - 1000)
    a.trackPageView('/b')
    await frame()
    tick(SESSION_TIMEOUT_MS + 1000)
    a.trackPageView('/c')
    await frame()
    const views = sent().filter((p) => p.event === 'page_view')
    expect(views[1].session_id).toBe(views[0].session_id)
    expect(views[2].session_id).not.toBe(views[0].session_id)
  })

  it('referrer and UTM tags only on a visit’s first view', async () => {
    saveConsent({ analytics: true, prefs: false })
    Object.defineProperty(document, 'referrer', { value: 'https://www.linkedin.com/', configurable: true })
    window.history.replaceState(null, '', '/?utm_source=linkedin&utm_medium=social&utm_campaign=launch')
    const a = new TestAnalytics(now)
    a.trackPageView('/')
    await frame()
    a.trackPageView('/projects')
    await frame()
    const [first, second] = sent().filter((p) => p.event === 'page_view')
    expect(first).toMatchObject({ referrer: 'https://www.linkedin.com/', utm_source: 'linkedin', utm_medium: 'social', utm_campaign: 'launch' })
    expect(second.event).toBe('page_view')
    expect(second.referrer).toBeUndefined()
    expect(second.utm_source).toBeUndefined()
  })

  it('withdrawal clears the visit and stops sending at once', async () => {
    saveConsent({ analytics: true, prefs: false })
    const a = new TestAnalytics(now)
    a.trackPageView('/a')
    await frame()
    saveConsent({ analytics: false, prefs: false })
    a.reset()
    expect(window.localStorage.getItem(VISIT_ID_KEY)).toBeNull()
    tick(10_000)
    window.dispatchEvent(new Event('pagehide'))
    a.trackPageView('/b')
    await frame()
    expect(sent()).toHaveLength(1)
  })
})

describe('exclusions', () => {
  it('?exclude_me=1 marks the browser, strips the parameter, and nothing is sent', async () => {
    saveConsent({ analytics: true, prefs: false })
    window.history.replaceState(null, '', '/blog?exclude_me=1&x=2#top')
    applyExcludeParam()
    expect(window.localStorage.getItem(EXCLUDE_ME_KEY)).toBe('1')
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/blog?x=2#top')
    const a = new TestAnalytics(now)
    a.trackPageView('/blog')
    await frame()
    expect(sent()).toHaveLength(0)

    window.history.replaceState(null, '', '/?exclude_me=0')
    applyExcludeParam()
    expect(window.localStorage.getItem(EXCLUDE_ME_KEY)).toBeNull()
    expect(window.location.search).toBe('')
  })

  it('never sends in development or against a local API without the explicit flag', () => {
    delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED
    expect(process.env.NODE_ENV).not.toBe('production')
    expect(trackingEnvironmentAllowed()).toBe(false)
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = 'true'
    expect(trackingEnvironmentAllowed()).toBe(true)
  })
})

describe('transport', () => {
  it('uses sendBeacon with a text/plain body when available', async () => {
    const beacon = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true, writable: true })
    saveConsent({ analytics: true, prefs: false })
    const a = new TestAnalytics(now)
    a.trackPageView('/')
    await frame()
    expect(beacon).toHaveBeenCalledTimes(1)
    const [url, blob] = beacon.mock.calls[0]
    expect(url).toMatch(/\/api\/analytics\/track$/)
    expect((blob as Blob).type).toBe('text/plain')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('AnalyticsProvider', () => {
  it('tracks the current page the moment analytics is allowed', async () => {
    vi.resetModules()
    const { default: AnalyticsProvider } = await import('@/components/AnalyticsProvider')
    pathname.value = '/'
    render(<AnalyticsProvider>page</AnalyticsProvider>)
    await frame()
    expect(sent()).toHaveLength(0)
    act(() => {
      saveConsent({ analytics: true, prefs: false })
    })
    await frame()
    expect(sent()).toEqual([expect.objectContaining({ event: 'page_view', page_path: '/' })])
  })
})
