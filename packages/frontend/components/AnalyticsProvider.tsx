'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import analytics from '@/lib/analytics'
import { ANALYTICS_EXEMPT, matchesRoute } from '@/lib/routes'

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    // The generated CV is printed by a headless browser; never count it.
    if (matchesRoute(pathname, ANALYTICS_EXEMPT)) return
    analytics.trackPageView(pathname)
  }, [pathname])

  return <>{children}</>
}
