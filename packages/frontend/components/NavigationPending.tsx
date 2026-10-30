'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { usePathname } from 'next/navigation'
import PageLoading from './PageLoading'

/** Longest a stuck navigation keeps the loader up (a cold API can take ~30s). */
const SAFETY_MS = 45000

function internalTarget(event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null
  const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
  if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return null
  let url: URL
  try {
    url = new URL(anchor.href, window.location.href)
  } catch {
    return null
  }
  if (url.origin !== window.location.origin) return null
  if (url.pathname === window.location.pathname) return null // same page or a hash link
  return url.pathname
}

/** True when <main> shows something other than this loader (the new page or its loading.tsx). */
function hasRouteContent(main: HTMLElement | null): boolean {
  if (!main) return false
  return Array.from(main.children).some((el) => !(el as HTMLElement).dataset.navPending)
}

/**
 * F-9 / QA B-2: when a link is clicked before Next has prefetched the target
 * route, Next can't show that route's loading.tsx yet, so the old page stays
 * frozen or <main> is empty until the server answers. This shows the
 * "Waking the server…" frame from the click until the new route has rendered
 * content in <main>. It is client-only, so it doesn't affect the server's
 * real 404 status or redirects (a root <Suspense> would).
 */
export default function NavigationPending({ mainRef }: { mainRef: RefObject<HTMLElement | null> }) {
  const pathname = usePathname()
  const [target, setTarget] = useState<string | null>(null)
  const startPath = useRef<string | null>(null)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const next = internalTarget(event)
      if (!next) return
      startPath.current = window.location.pathname
      setTarget(next)
    }
    const onPop = () => setTarget(null)
    // Capture phase: Next's <Link> calls preventDefault() in its own click
    // handler, so a bubbling listener would never see a usable click.
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPop)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  useEffect(() => {
    if (!target) return
    const main = mainRef.current
    const check = () => {
      // Done once the URL has moved and <main> holds the new route's content.
      if (window.location.pathname !== startPath.current && hasRouteContent(main)) setTarget(null)
    }
    const observer = new MutationObserver(check)
    if (main) observer.observe(main, { childList: true, subtree: true })
    const safety = setTimeout(() => setTarget(null), SAFETY_MS)
    check()
    return () => {
      observer.disconnect()
      clearTimeout(safety)
    }
  }, [target, pathname, mainRef])

  if (!target) return null
  return (
    <div data-nav-pending="true" className="nav-pending">
      <PageLoading />
    </div>
  )
}
