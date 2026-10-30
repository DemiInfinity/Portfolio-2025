'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import SiteHeader from './SiteHeader'
import Footer from './Footer'
import { OverlayProvider } from './overlays/OverlayProvider'
import { ToastProvider } from './ui/Toast'
import { BARE_ROUTES, matchesRoute } from '@/lib/routes'

/**
 * Skip link, header, main, footer and the shared overlays. Bare routes
 * (`/cv`) render only their content.
 */
export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (matchesRoute(pathname, BARE_ROUTES)) return <>{children}</>

  return (
    <ToastProvider>
      <OverlayProvider>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </OverlayProvider>
    </ToastProvider>
  )
}
