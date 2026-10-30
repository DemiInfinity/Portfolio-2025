'use client'

import { openCookieSettings } from '@/lib/consent'
import { useConsent, useHydrated } from './consent/useConsent'

/** /privacy: the visitor's current analytics state and a button that opens Cookie settings. */
export default function WebsiteAnalyticsChoice() {
  const consent = useConsent()
  const hydrated = useHydrated()
  const state = !hydrated
    ? 'Checking your choice…'
    : consent === null
      ? 'You haven’t made a choice yet, so analytics is off in this browser.'
      : consent.analytics
        ? 'Analytics is on in this browser.'
        : 'Analytics is off in this browser.'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
      <p role="status">{state}</p>
      <button type="button" className="btn btn-soft btn-sm" onClick={openCookieSettings}>
        Cookie settings
      </button>
    </div>
  )
}
