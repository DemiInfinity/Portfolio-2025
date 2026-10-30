/**
 * Visitor consent (UK PECR / UK GDPR): analytics and preferences are OPT-IN.
 *
 * Stored in localStorage as `portfolio_consent` = { v, analytics, prefs, at }.
 * Every read and write is wrapped in try/catch and fails closed: if the value
 * can't be read or parsed, there is no consent and nothing is tracked.
 *
 * Versioning: bump CONSENT_VERSION whenever the banner/settings wording or the
 * categories change. A stored choice with another `v` is ignored, so every
 * visitor is asked again under the new wording.
 */

export const CONSENT_KEY = 'portfolio_consent'
export const CONSENT_VERSION = 1
/** The old opt-out flag ('1' = analytics off). Migrated once, then removed. */
export const LEGACY_OPT_OUT_KEY = 'portfolio_analytics_opt_out'
/** The visit (session) id and its last activity, { id, last }. Created only after analytics consent; removed when it is withdrawn. */
export const VISIT_ID_KEY = 'portfolio_visit_id'
/** Preference-category keys, removed when preferences are turned off. */
export const PREFERENCE_KEYS = ['home_colourway']
export const PREFERENCE_PREFIXES = ['post_sparkle:']

export const CONSENT_EVENT = 'portfolio-consent-change'
export const OPEN_SETTINGS_EVENT = 'portfolio-open-cookie-settings'

export type Consent = { v: number; analytics: boolean; prefs: boolean; at: string }

// When storage is blocked the choice still holds for this visit.
let memoryConsent: Consent | null = null

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function isConsent(value: unknown): value is Consent {
  const c = value as Consent
  return Boolean(c) && typeof c === 'object' && c.v === CONSENT_VERSION && typeof c.analytics === 'boolean' && typeof c.prefs === 'boolean'
}

/** The current choice, or null when the visitor hasn't chosen yet (or it can't be read). */
export function readConsent(): Consent | null {
  const store = storage()
  if (!store) return memoryConsent
  try {
    const raw = store.getItem(CONSENT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return isConsent(parsed) ? parsed : memoryConsent
    }
    const legacy = store.getItem(LEGACY_OPT_OUT_KEY)
    if (legacy !== null) {
      store.removeItem(LEGACY_OPT_OUT_KEY)
      // '1' was an explicit "analytics off": keep it as a refusal. Anything else: ask.
      if (legacy === '1') return saveConsent({ analytics: false, prefs: false }, { notify: false })
    }
  } catch {
    return memoryConsent
  }
  return memoryConsent
}

/** Cached snapshot for useSyncExternalStore (same object until the stored value changes). */
let snapshotRaw: string | null | undefined
let snapshot: Consent | null = null
export function consentSnapshot(): Consent | null {
  const current = readConsent()
  const raw = current ? JSON.stringify(current) : null
  if (raw !== snapshotRaw) {
    snapshotRaw = raw
    snapshot = current
  }
  return snapshot
}

export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true
}

export function hasPreferenceConsent(): boolean {
  return readConsent()?.prefs === true
}

/** Global Privacy Control or Do Not Track. Defaults analytics to off and shows a note; the visitor can still opt in. */
export function browserAsksNotToTrack(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  return nav.globalPrivacyControl === true || nav.doNotTrack === '1'
}

function removeKeys(predicate: (key: string) => boolean) {
  const store = storage()
  if (!store) return
  try {
    const keys: string[] = []
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)
      if (key && predicate(key)) keys.push(key)
    }
    keys.forEach((k) => store.removeItem(k))
  } catch {
    // storage blocked: nothing stored to remove
  }
}

export function clearVisitId() {
  try {
    window.sessionStorage.removeItem(VISIT_ID_KEY)
  } catch {
    // ignore
  }
  removeKeys((k) => k === VISIT_ID_KEY)
}

export function clearPreferences() {
  removeKeys((k) => PREFERENCE_KEYS.includes(k) || PREFERENCE_PREFIXES.some((p) => k.startsWith(p)))
}

/** Saves a choice, applies it at once (visit id / preferences removed when refused) and notifies listeners. */
export function saveConsent(choice: { analytics: boolean; prefs: boolean }, options: { notify?: boolean } = {}): Consent {
  const consent: Consent = { v: CONSENT_VERSION, analytics: choice.analytics, prefs: choice.prefs, at: new Date().toISOString() }
  memoryConsent = consent
  const store = storage()
  try {
    store?.setItem(CONSENT_KEY, JSON.stringify(consent))
  } catch {
    // storage blocked: the in-memory choice holds for this visit
  }
  if (!consent.analytics) clearVisitId()
  if (!consent.prefs) clearPreferences()
  if (options.notify !== false && typeof window !== 'undefined') window.dispatchEvent(new Event(CONSENT_EVENT))
  return consent
}

export function subscribeConsent(callback: () => void) {
  window.addEventListener(CONSENT_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(CONSENT_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

/** Opens the Cookie settings dialog from anywhere (footer, privacy page). */
export function openCookieSettings() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))
}

/** Test helper: forget the in-memory fallback. */
export function resetConsentMemory() {
  memoryConsent = null
  snapshotRaw = undefined
  snapshot = null
}
