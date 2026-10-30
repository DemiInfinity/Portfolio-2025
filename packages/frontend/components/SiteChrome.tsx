'use client'

import { useRef } from 'react'
import { useSitePathname } from './SitePathname'
import type { ReactNode } from 'react'
import SiteHeader from './SiteHeader'
import Footer from './Footer'
import { OverlayProvider } from './overlays/OverlayProvider'
import { ToastProvider } from './ui/Toast'
import ConsentManager from './consent/ConsentManager'
import NavigationPending from './NavigationPending'
import { BARE_ROUTES, matchesRoute } from '@/lib/routes'

/**
 * Skip link, header, main, footer, the shared overlays and the consent
 * banner. Bare routes (`/cv`) render only their content (no banner).
 */
export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = useSitePathname()
  const mainRef = useRef<HTMLElement>(null)
  if (matchesRoute(pathname, BARE_ROUTES)) return <>{children}</>

  return (
    <ToastProvider>
      <OverlayProvider>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} ref={mainRef}>
          {children}
          <NavigationPending mainRef={mainRef} />
        </main>
        <Footer />
        <ConsentManager />
      </OverlayProvider>
    </ToastProvider>
  )
}
