import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import AnalyticsProvider from '@/components/AnalyticsProvider'
import Footer from '@/components/Footer'
import MaintenanceWrapper from '@/components/MaintenanceWrapper'

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900']
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://demitaylornimmo.com'),
  title: 'Demi Taylor Nimmo - Full Stack Software Engineer ✨',
  description: 'Beautiful portfolio of Demi Taylor Nimmo, showcasing creative projects, skills, and professional experience in software engineering.',
  keywords: 'software engineer, full stack developer, web development, portfolio, creative developer',
  authors: [{ name: 'Demi Taylor Nimmo' }],
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/brand-logo.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: { url: '/brand-logo.png', type: 'image/png' },
  },
  openGraph: {
    title: 'Demi Taylor Nimmo - Full Stack Software Engineer ✨',
    description: 'Beautiful portfolio showcasing creative projects, skills, and professional experience.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${poppins.className} min-h-screen`}>
        <MaintenanceWrapper>
          <AnalyticsProvider>
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </AnalyticsProvider>
        </MaintenanceWrapper>
      </body>
    </html>
  )
}
