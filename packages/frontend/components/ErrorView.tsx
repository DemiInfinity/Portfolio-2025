'use client'

import { useEffect, useId, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import Button from '@/components/ui/Button'
import Spark from '@/components/ui/Spark'
import { useOptionalOverlay } from '@/components/overlays/OverlayProvider'
import { contact } from '@/lib/content/site'

const d = (ms: number) => ({ ['--d' as string]: `${ms}ms` }) as CSSProperties
const SPARKLE = 'M112 0 C112.7 7.4 118.6 13.3 126 14 C118.6 14.7 112.7 20.6 112 28 C111.3 20.6 105.4 14.7 98 14 C105.4 13.3 111.3 7.4 112 0 Z'

export type ErrorBoundaryProps = {
  error: Error & { digest?: string }
  /** Next 16.3+: re-fetches and re-renders the segment (recovers from a cold-start API failure). */
  retry?: () => void
  /** Clears the error and re-renders without re-fetching. Used when `retry` isn't provided. */
  reset?: () => void
}

/** The broken infinity mark from Error.dc.html. */
export function BrokenLoop({ width = 260 }: { width?: number }) {
  const gradientId = useId()
  return (
    <svg className="err-tilt" viewBox="0 0 128 72" width={width} height={(width * 146) / 260} role="img" aria-label="The Demi infinity logo with its loop broken open">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f472b6" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path d="M60 40 C75 18 108 18 108 40 C108 62 75 62 60 40" fill="none" stroke={`url(#${gradientId})`} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M54 33 C42 20 12 21 12 40 C12 62 45 62 52 49" fill="none" stroke={`url(#${gradientId})`} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d={SPARKLE} fill="#f472b6" />
    </svg>
  )
}

/**
 * 500 (Error.dc.html), inside the site chrome. Route-level error.tsx files pass
 * their own title (for example "Couldn't load projects") and message.
 */
export default function ErrorView({
  error,
  retry,
  reset,
  title,
  message = 'That one’s on me, not you. The page didn’t load properly. Give it another go in a moment.',
}: ErrorBoundaryProps & { title?: ReactNode; message?: string }) {
  const overlay = useOptionalOverlay()
  const [retrying, setRetrying] = useState(false)
  const digest = error?.digest

  useEffect(() => {
    console.error(error)
  }, [error])

  useEffect(() => {
    if (!retrying) return
    const t = setTimeout(() => setRetrying(false), 1400)
    return () => clearTimeout(t)
  }, [retrying])

  const tryAgain = () => {
    setRetrying(true)
    if (retry) retry()
    else reset?.()
  }

  return (
    // Bare routes (/cv) have no header to sit under.
    <div className={overlay ? 'under-header' : undefined} style={{ background: 'linear-gradient(160deg, #f8f4ff 0%, #fff8f0 55%, #efe4ff 100%)', minHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
      <div className="wrap" style={{ flex: 1, display: 'flex', alignItems: 'center', paddingTop: 32, paddingBottom: 96, position: 'relative' }}>
        <Spark className="twinkle" style={{ ['--d' as string]: '.6s', position: 'absolute', right: '12%', top: '18%', width: 26, height: 26, color: 'var(--c1)' } as CSSProperties} />
        <div className="err-grid">
          <div className="in" style={{ display: 'flex', justifyContent: 'center' }}>
            <BrokenLoop />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 560 }}>
            <h1 className="serif in" style={{ ...d(150), fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 1.08 }}>
              {title ?? (
                <>
                  Something <span className="script grad-text" style={{ fontSize: '1.15em', paddingRight: '.1em' }}>broke</span>
                </>
              )}
            </h1>
            <p className="in" style={{ ...d(260), fontSize: 'var(--t-lead)', lineHeight: 1.6 }}>{message}</p>
            <div className="in" style={{ ...d(360), display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
              <Button onClick={tryAgain} loading={retrying}>
                {retrying ? 'Trying again' : 'Try again'}
              </Button>
              <Button href="/" variant="line">Back to home</Button>
            </div>
            <p className="in" style={{ ...d(460), fontSize: 'var(--t-meta)', lineHeight: 1.6 }}>
              Still stuck?{' '}
              {overlay ? (
                <button type="button" onClick={overlay.openContact} style={{ border: 0, background: 'none', padding: 0, font: 'inherit', color: '#5b21b6', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                  Let me know
                </button>
              ) : (
                <a href={`mailto:${contact.email}`} style={{ color: '#5b21b6', fontWeight: 600 }}>
                  Let me know
                </a>
              )}
              {digest ? (
                <>
                  {' '}and quote this reference: <span className="err-ref">ERR {digest}</span>
                </>
              ) : (
                '.'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
