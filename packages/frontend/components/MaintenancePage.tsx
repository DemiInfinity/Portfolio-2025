import { useId } from 'react'
import type { CSSProperties } from 'react'
import Spark from '@/components/ui/Spark'
import { contact } from '@/lib/content/site'

const LOOP = 'M60 40 C75 18 108 18 108 40 C108 62 75 62 60 40 C45 18 12 18 12 40 C12 62 45 62 60 40 Z'
const SPARKLE = 'M112 0 C112.7 7.4 118.6 13.3 126 14 C118.6 14.7 112.7 20.6 112 28 C111.3 20.6 105.4 14.7 98 14 C105.4 13.3 111.3 7.4 112 0 Z'
const d = (ms: number) => ({ ['--d' as string]: `${ms}ms` }) as CSSProperties
const tw = (style: CSSProperties, delay: string) => ({ ...style, ['--d' as string]: delay }) as CSSProperties

/**
 * Maintenance (Maintenance.dc.html). Shown by MaintenanceWrapper while the
 * `maintenance_mode` flag is on; /cv, /privacy and /terms stay reachable.
 */
export default function MaintenancePage() {
  const gradientId = useId()
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f8f4ff 0%, #fff8f0 55%, #efe4ff 100%)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'clip' }}>
      <header style={{ width: '100%', maxWidth: 1240, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" width={128} height={72} style={{ height: 30, width: 'auto', display: 'block' }} />
        <span className="script" style={{ fontSize: 28, color: '#5b21b6' }}>Demi</span>
      </header>

      <main id="main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 72px', position: 'relative' }}>
        <Spark className="twinkle" style={tw({ position: 'absolute', left: '14%', top: '18%', width: 28, height: 28, color: '#f472b6' }, '.2s')} />
        <Spark className="twinkle" style={tw({ position: 'absolute', right: '16%', top: '26%', width: 20, height: 20, color: '#7c3aed' }, '1.3s')} />
        <Spark className="twinkle" style={tw({ position: 'absolute', left: '22%', bottom: '20%', width: 16, height: 16, color: '#b388ff' }, '2.1s')} />

        <div style={{ maxWidth: 640, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
          <svg className="mt-float in" viewBox="0 0 128 72" width={200} height={113} role="img" aria-label="The Demi infinity logo, drawing itself">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#f472b6" />
                <stop offset="1" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
            <path className="mt-loop" d={LOOP} fill="none" stroke={`url(#${gradientId})`} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <path className="twinkle" style={{ transformOrigin: '112px 14px' }} d={SPARKLE} fill="#f472b6" />
          </svg>
          <span className="mt-pill in" style={d(120)}>
            <span className="mt-pulse" aria-hidden="true" />
            Maintenance in progress
          </span>
          <h1 className="serif in" style={{ ...d(200), fontSize: 'clamp(48px, 6vw, 84px)', lineHeight: 1.05 }}>
            Back <span className="script grad-text" style={{ fontSize: '1.15em', paddingRight: '.1em' }}>soon</span>
          </h1>
          <p className="in" style={{ ...d(320), fontSize: 'var(--t-lead)', lineHeight: 1.6, maxWidth: '44ch' }}>
            I’m polishing a few things behind the scenes. The site will be back shortly, with a little extra sparkle.
          </p>
          <div className="in" style={{ ...d(440), display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
            <a className="btn btn-fill" href={contact.linkedin}>Message me on LinkedIn</a>
            <a className="btn btn-line" href={contact.github}>See my GitHub</a>
          </div>
          <p className="in" style={{ ...d(560), fontSize: 'var(--t-meta)' }}>
            Need my CV? It’s still available:{' '}
            <a href="/cv" style={{ color: '#5b21b6', fontWeight: 600 }}>view the CV</a>.
          </p>
        </div>
      </main>

      <footer style={{ width: '100%', maxWidth: 1240, margin: '0 auto', padding: '0 24px 32px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', fontSize: 'var(--t-sm)' }}>
        <span>© {new Date().getFullYear()} Demi Taylor Nimmo</span>
        <nav aria-label="Legal" style={{ display: 'flex', gap: 18 }}>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
      </footer>
    </div>
  )
}
