'use client'

import { useCallback, useSyncExternalStore } from 'react'

const EVENT = 'portfolio-local-storage'

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(EVENT, callback)
  }
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * A localStorage value that renders as `null` on the server and on the first
 * client render (no hydration mismatch), then the stored value. Every
 * read/write is wrapped in try/catch: blocked storage just means "not remembered".
 */
export function useLocalStorage(key: string): [string | null, (value: string | null) => void] {
  const value = useSyncExternalStore(subscribe, () => read(key), () => null)
  const set = useCallback(
    (next: string | null) => {
      try {
        if (next === null) window.localStorage.removeItem(key)
        else window.localStorage.setItem(key, next)
      } catch {
        // storage blocked
      }
      window.dispatchEvent(new Event(EVENT))
    },
    [key]
  )
  return [value, set]
}

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  query?.addEventListener?.('change', callback)
  return () => query?.removeEventListener?.('change', callback)
}

/** True when the visitor prefers reduced motion (false on the server). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    () => false
  )
}
