'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import Button from '@/components/ui/Button'
import Spark from '@/components/ui/Spark'
import { useOverlay } from '@/components/overlays/OverlayProvider'

const d = (ms: number) => ({ ['--d' as string]: `${ms}ms` }) as CSSProperties

const POPULAR = [
  { href: '/projects', label: 'Projects', hint: 'LunaLore, Infinity Tracker' },
  { href: '/experience', label: 'Experience', hint: 'Five years, four roles' },
  { href: '/about', label: 'About', hint: 'Who I am, what I’m after' },
  { href: '/blog', label: 'Blog', hint: 'Notes from real builds' },
]

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/** 404 (NotFound.dc.html), inside the normal site chrome. */
export default function NotFoundView() {
  const { openContact } = useOverlay()
  return (
    <div className="under-header" style={{ background: 'linear-gradient(160deg, #f8f4ff 0%, #fff8f0 55%, #efe4ff 100%)' }}>
      <div className="wrap" style={{ paddingTop: 56, paddingBottom: 96, position: 'relative', display: 'grid', gap: 40 }}>
        <Spark className="twinkle" style={{ ['--d' as string]: '.4s', position: 'absolute', right: '10%', top: 40, width: 30, height: 30, color: 'var(--c1)' } as CSSProperties} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px, 4vw, 48px)', flexWrap: 'wrap' }}>
          <p className="big-num in" aria-hidden="true">404</p>
          <Spark className="wander" style={{ width: 54, height: 54, color: 'var(--c1)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 620 }}>
          <h1 className="serif in" style={{ ...d(150), fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 1.08 }}>
            This page took a <span className="script grad-text" style={{ fontSize: '1.15em', paddingRight: '.1em' }}>wrong turn</span>
          </h1>
          <p className="in" style={{ ...d(260), fontSize: 'var(--t-lead)', lineHeight: 1.6 }}>
            The link might be old, or the page has moved. Here are a few places worth a look instead.
          </p>
          <div className="in" style={{ ...d(360), display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
            <Button href="/">Back to home</Button>
            <Button variant="line" onClick={openContact}>Tell me what you were after</Button>
          </div>
        </div>
        <nav aria-label="Popular pages" className="grid4 in" style={d(480)}>
          {POPULAR.map((page) => (
            <Link key={page.href} className="go-card" href={page.href}>
              <span>
                {page.label}
                <small>{page.hint}</small>
              </span>
              <Arrow />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
