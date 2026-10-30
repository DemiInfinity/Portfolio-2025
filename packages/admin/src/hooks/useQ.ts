import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

/*
 * One `?q=` drives both the top-bar search and the page toolbar search (QA NB-1).
 * The text lives in a small shared store, so inputs update on every keystroke and never wait for the router.
 * The URL follows 150 ms after the last keystroke (history replace); a URL change from elsewhere
 * (navigation, "Clear filters" on another page, back/forward) flows back into the store.
 */
let current = ''
let pending: ReturnType<typeof setTimeout> | null = null
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
const subscribe = (f: () => void) => {
  subs.add(f)
  return () => subs.delete(f)
}
const snapshot = () => current

let lastPath: string | null = null

export const Q_SYNC_MS = 150

/** Clear the shared search text (route change, tests). */
export function resetQ(to = '') {
  if (pending) clearTimeout(pending)
  pending = null
  current = to
  emit()
}

export function useQ(): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams()
  const urlQ = params.get('q') || ''
  const q = useSyncExternalStore(subscribe, snapshot, snapshot)

  const { pathname } = useLocation()
  useEffect(() => {
    // A new page starts from its own URL; a write still pending for the old page is dropped.
    if (lastPath !== pathname) {
      lastPath = pathname
      if (pending || urlQ !== current) resetQ(urlQ)
      return
    }
    if (pending === null && urlQ !== current) {
      current = urlQ
      emit()
    }
  }, [urlQ, pathname])

  const setQ = useCallback(
    (v: string) => {
      current = v
      emit()
      if (pending) clearTimeout(pending)
      pending = setTimeout(() => {
        pending = null
        setParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            if (current) next.set('q', current)
            else next.delete('q')
            return next
          },
          { replace: true },
        )
      }, Q_SYNC_MS)
    },
    [setParams],
  )
  return [q, setQ]
}
