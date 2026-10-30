'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import analytics, { applyExcludeParam } from '@/lib/analytics'
import { ANALYTICS_EXEMPT, matchesRoute } from '@/lib/routes'
import { useConsent } from './consent/useConsent'

/**
 * Page views (H-23). Tracks the current page as soon as analytics is allowed,
 * including the page the visitor is on when they click "Allow analytics", and
 * every page after. Withdrawing consent stops tracking at once.
 */
export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const allowed = useConsent()?.analytics === true

  useEffect(() => {
    applyExcludeParam()
  }, [])

  useEffect(() => {
    if (!allowed) {
      analytics.reset()
      return
    }
    // The generated CV is printed by a headless browser; never count it.
    if (matchesRoute(pathname, ANALYTICS_EXEMPT)) return
    analytics.trackPageView(pathname)
  }, [pathname, allowed])

  return <>{children}</>
}
