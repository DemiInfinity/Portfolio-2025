'use client'

import { useSyncExternalStore } from 'react'
import { consentSnapshot, subscribeConsent } from '@/lib/consent'
import type { Consent } from '@/lib/consent'

/** The visitor's consent; null on the server, on first render, and before a choice is made. */
export function useConsent(): Consent | null {
  return useSyncExternalStore(subscribeConsent, consentSnapshot, () => null)
}

const noopSubscribe = () => () => {}

/** False on the server and during hydration, true after: avoids rendering browser-only UI on the server. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}
