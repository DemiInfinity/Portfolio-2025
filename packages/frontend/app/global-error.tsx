'use client'

import { useEffect } from 'react'

const SPARKLE = 'M112 0 C112.7 7.4 118.6 13.3 126 14 C118.6 14.7 112.7 20.6 112 28 C111.3 20.6 105.4 14.7 98 14 C105.4 13.3 111.3 7.4 112 0 Z'

/**
 * Root-layout failures (Error.dc.html, minimal). This replaces the root layout,
 * so it carries its own document, inline styles and system fonts.
 */
export default function GlobalError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string }
  retry?: () => void
  reset?: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const button = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 52,
    padding: '0 28px',
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 16,
    textDecoration: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
  } as const

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Poppins, system-ui, sans-serif', color: '#2d3436', background: 'linear-gradient(160deg, #f8f4ff 0%, #fff8f0 55%, #efe4ff 100%)', minHeight: '100vh' }}>
        <title>Something broke | Demi Taylor Nimmo</title>
        <main style={{ maxWidth: 640, margin: '0 auto', padding: '96px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <svg viewBox="0 0 128 72" width={160} height={90} role="img" aria-label="The Demi infinity logo with its loop broken open">
            <path d="M60 40 C75 18 108 18 108 40 C108 62 75 62 60 40" fill="none" stroke="#7c3aed" strokeWidth="10" strokeLinecap="round" />
            <path d="M54 33 C42 20 12 21 12 40 C12 62 45 62 52 49" fill="none" stroke="#f472b6" strokeWidth="10" strokeLinecap="round" />
            <path d={SPARKLE} fill="#f472b6" />
          </svg>
          <h1 style={{ margin: 0, fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 1.08 }}>Something broke</h1>
          <p style={{ margin: 0, fontSize: 19, lineHeight: 1.6 }}>
            That one’s on me, not you. The page didn’t load properly. Give it another go in a moment.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => (retry ? retry() : reset?.())} style={{ ...button, border: 0, color: '#fff', background: 'linear-gradient(45deg, #7c3aed, #5b21b6)' }}>
              Try again
            </button>
            {/* A full page load on purpose: the root layout itself failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ ...button, border: '2px solid #7c3aed', color: '#5b21b6', background: '#fff' }}>
              Back to home
            </a>
          </div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>
            Still stuck? <a href="mailto:demi.21@outlook.com" style={{ color: '#5b21b6', fontWeight: 600 }}>Let me know</a>
            {error?.digest ? (
              <>
                {' '}and quote this reference:{' '}
                <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, padding: '4px 10px', borderRadius: 8, background: '#f1e8ff', color: '#4c1d95' }}>
                  ERR {error.digest}
                </span>
              </>
            ) : (
              '.'
            )}
          </p>
        </main>
      </body>
    </html>
  )
}
