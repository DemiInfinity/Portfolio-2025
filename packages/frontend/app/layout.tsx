import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { OriginalPathProvider } from '@/components/SitePathname'
import { ORIGINAL_PATH_HEADER } from '@/lib/originalPath'
import { Dancing_Script, JetBrains_Mono, Playfair_Display, Poppins, Source_Serif_4 } from 'next/font/google'
import './globals.css'
import AnalyticsProvider from '@/components/AnalyticsProvider'
import MaintenanceWrapper from '@/components/MaintenanceWrapper'
import SiteChrome from '@/components/SiteChrome'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-poppins', display: 'swap' })
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-playfair', display: 'swap' })
const dancing = Dancing_Script({ subsets: ['latin'], weight: ['700'], variable: '--font-dancing', display: 'swap' })
const sourceSerif = Source_Serif_4({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-source-serif', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://demitaylornimmo.com'),
  title: {
    default: 'Home | Demi Taylor Nimmo',
    template: '%s | Demi Taylor Nimmo',
  },
  description:
    'Portfolio of Demi Taylor Nimmo, full-stack software engineer: projects, writing and professional experience.',
  keywords: 'software engineer, full stack developer, web development, portfolio, creative developer',
  authors: [{ name: 'Demi Taylor Nimmo' }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Home | Demi Taylor Nimmo',
    description: 'Projects, writing and professional experience from full-stack software engineer Demi Taylor Nimmo.',
    type: 'website',
    siteName: 'Demi Taylor Nimmo',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Demi Taylor Nimmo, full-stack software engineer' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-default.png'],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Set by proxy.ts only when it rewrites a missing detail page to the 404.
  const originalPath = (await headers()).get(ORIGINAL_PATH_HEADER)
  return (
    <html lang="en" className={`${poppins.variable} ${playfair.variable} ${dancing.variable} ${jetbrains.variable} ${sourceSerif.variable}`}>
      <body>
        <MaintenanceWrapper>
          <AnalyticsProvider>
            <OriginalPathProvider value={originalPath}>
              <SiteChrome>{children}</SiteChrome>
            </OriginalPathProvider>
          </AnalyticsProvider>
        </MaintenanceWrapper>
      </body>
    </html>
  )
}
