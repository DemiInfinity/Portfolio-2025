import { VISIT_ID_KEY, hasAnalyticsConsent } from './consent'

/**
 * First-party analytics, contract H-23 (analytics v2). OPT-IN: nothing is sent
 * and nothing is stored until the visitor allows analytics (lib/consent.ts).
 *
 * - Every page view has its own `view_id`. `page_view` is sent when the view
 *   starts; `view_update` carries that view's running total of visible seconds
 *   and is sent when the visitor leaves the page in the app, hides the tab or
 *   unloads it. Coming back to the tab resumes the same view's timer, so one
 *   view never overwrites another's time.
 * - A visit (`session_id`) lives in localStorage as { id, last } and is replaced
 *   after 30 minutes without activity. The referrer and UTM tags are sent only
 *   on a visit's first view.
 * - `?exclude_me=1` on any URL marks this browser as never tracked
 *   (localStorage `portfolio_exclude_me`); `?exclude_me=0` clears it.
 * - Only sends in a production build talking to a non-local API, or when
 *   NEXT_PUBLIC_ANALYTICS_ENABLED=true (Cypress against the mock API).
 */

export const EXCLUDE_ME_KEY = 'portfolio_exclude_me'
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'] as const

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : 'https://api.demitaylornimmo.com/api'
}

/** Never send from `next dev` or from a build pointed at a local API, unless explicitly enabled. */
export function trackingEnvironmentAllowed(): boolean {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true') return true
  if (process.env.NODE_ENV !== 'production') return false
  const api = process.env.NEXT_PUBLIC_API_URL || 'https://api.demitaylornimmo.com'
  try {
    const host = new URL(api).hostname
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) return false
  } catch {
    return false
  }
  if (typeof navigator !== 'undefined' && navigator.webdriver) return false
  return true
}

export function isExcluded(): boolean {
  try {
    return window.localStorage.getItem(EXCLUDE_ME_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Reads `?exclude_me=1|0`, stores or clears the flag, then removes the
 * parameter from the address bar (other parameters and the hash are kept).
 */
export function applyExcludeParam(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  const value = url.searchParams.get('exclude_me')
  if (value === null) return
  try {
    if (value === '1') window.localStorage.setItem(EXCLUDE_ME_KEY, '1')
    else if (value === '0') window.localStorage.removeItem(EXCLUDE_ME_KEY)
  } catch {
    // storage blocked: nothing to remember
  }
  url.searchParams.delete('exclude_me')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    // fall through
  }
  // RFC 4122 v4 from Math.random (old browsers only).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

type Session = { id: string; last: number }

type View = {
  viewId: string
  path: string
  engagedMs: number
  segmentStart: number | null
  lastSentSeconds: number
}

export type PageViewPayload = {
  event: 'page_view'
  view_id: string
  session_id: string
  page_path: string
  page_title?: string
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

export type ViewUpdatePayload = {
  event: 'view_update'
  view_id: string
  session_id: string
  page_path: string
  duration_seconds: number
}

export class Analytics {
  private view: View | null = null
  private sessionId: string | null = null
  private listening = false
  /** view_ids whose page_view has gone out: guards against Strict Mode and re-renders. */
  private sentViews = new Set<string>()

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Consent, not excluded, and an environment that may send. Checked before every send. */
  enabled(): boolean {
    return typeof window !== 'undefined' && trackingEnvironmentAllowed() && hasAnalyticsConsent() && !isExcluded()
  }

  private onVisibility = () => (document.hidden ? this.pause() : this.resume())
  private onPageHide = () => this.pause()
  // Back/forward cache: the same page comes back, so the same view resumes.
  private onPageShow = (event: Event) => {
    if ((event as PageTransitionEvent).persisted) this.resume()
  }

  private listen() {
    if (this.listening || typeof window === 'undefined') return
    this.listening = true
    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('pagehide', this.onPageHide)
    window.addEventListener('pageshow', this.onPageShow)
  }

  /** Removes the listeners (tests; the app keeps one instance for the page's life). */
  dispose() {
    if (!this.listening) return
    this.listening = false
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('pagehide', this.onPageHide)
    window.removeEventListener('pageshow', this.onPageShow)
  }

  /** The visit id, replaced after 30 minutes without activity. `isNew` = this view starts the visit. */
  private touchSession(): { id: string; isNew: boolean } {
    const at = this.now()
    let stored: Session | null = null
    try {
      const raw = window.localStorage.getItem(VISIT_ID_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      if (parsed && typeof parsed.id === 'string' && typeof parsed.last === 'number') stored = parsed
    } catch {
      stored = null
    }
    const fresh = !stored || at - stored.last > SESSION_TIMEOUT_MS
    const id = fresh ? uuid() : (stored as Session).id
    try {
      window.localStorage.setItem(VISIT_ID_KEY, JSON.stringify({ id, last: at }))
    } catch {
      // storage blocked: the id lives in memory for this page
    }
    this.sessionId = id
    return { id, isNew: fresh }
  }

  private engagedSeconds(view: View): number {
    const running = view.segmentStart !== null ? this.now() - view.segmentStart : 0
    return Math.round((view.engagedMs + running) / 1000)
  }

  /** Sends that survive unload: sendBeacon as text/plain JSON (no CORS preflight), else fetch keepalive. */
  private send(payload: PageViewPayload | ViewUpdatePayload) {
    if (!this.enabled()) return
    const url = `${apiBase()}/analytics/track`
    const body = JSON.stringify(payload)
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        if (navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return
      }
    } catch {
      // fall back to fetch
    }
    try {
      void fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, keepalive: true }).catch(() => {})
    } catch {
      // never interrupt the visit
    }
  }

  /** Sends the current view's running total, if it has grown since the last send. */
  private sendUpdate() {
    const view = this.view
    if (!view || !this.sessionId || !this.sentViews.has(view.viewId)) return
    const seconds = this.engagedSeconds(view)
    if (seconds <= 0 || seconds <= view.lastSentSeconds) return
    view.lastSentSeconds = seconds
    this.send({ event: 'view_update', view_id: view.viewId, session_id: this.sessionId, page_path: view.path, duration_seconds: seconds })
  }

  /** Tab hidden or page unloading: stop the clock and report the total so far. */
  pause() {
    const view = this.view
    if (!view) return
    if (view.segmentStart !== null) {
      view.engagedMs += this.now() - view.segmentStart
      view.segmentStart = null
    }
    if (this.enabled()) this.sendUpdate()
  }

  /** Tab visible again: the same view keeps counting. */
  resume() {
    const view = this.view
    if (!view || view.segmentStart !== null || document.hidden) return
    view.segmentStart = this.now()
  }

  /**
   * A page view for `path`. Ignored when it is already the current view
   * (React Strict Mode's double effect, re-renders), when not enabled, or
   * before consent. Leaving the previous view sends its final time first.
   */
  trackPageView(path: string) {
    if (typeof window === 'undefined' || !this.enabled()) return
    if (this.view && this.view.path === path) return
    this.listen()

    if (this.view) this.pause()

    const { id: sessionId, isNew } = this.touchSession()
    const view: View = { viewId: uuid(), path, engagedMs: 0, segmentStart: document.hidden ? null : this.now(), lastSentSeconds: 0 }
    this.view = view

    const extras: Partial<PageViewPayload> = {}
    if (isNew) {
      if (document.referrer) extras.referrer = document.referrer.slice(0, 500)
      const params = new URLSearchParams(window.location.search)
      for (const key of UTM_KEYS) {
        const value = params.get(key)
        if (value) extras[key] = value.slice(0, key === 'utm_campaign' ? 200 : 100)
      }
    }

    // One frame later, so a streamed <title> for the new page has landed (audit L4).
    const sendView = () => {
      if (this.view !== view || this.sentViews.has(view.viewId) || !this.enabled()) return
      this.sentViews.add(view.viewId)
      this.send({
        event: 'page_view',
        view_id: view.viewId,
        session_id: sessionId,
        page_path: path,
        page_title: document.title ? document.title.slice(0, 500) : undefined,
        ...extras,
      })
    }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(sendView, 0))
    else setTimeout(sendView, 0)
  }

  /** Consent withdrawn or browser excluded: forget the view and the visit (storage is cleared by lib/consent). */
  reset() {
    this.view = null
    this.sessionId = null
  }
}

const analytics = new Analytics()

export default analytics
