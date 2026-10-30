'use client'

import type { CSSProperties } from 'react'
import Button from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import Spark from '@/components/ui/Spark'
import { useOverlay } from '@/components/overlays/OverlayProvider'
import type { Project } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/mediaUrl'

const twinkle = (style: CSSProperties, d: string) => ({ ...style, ['--d' as string]: d }) as CSSProperties
const LEAD: CSSProperties = { fontSize: 'var(--t-lead)', lineHeight: 1.6 }
const H2: CSSProperties = { fontSize: 'var(--t-h2)', lineHeight: 1.02 }

function caseStudyHref(project: Project) {
  return `/projects/${project.slug}`
}

function technologies(project: Project): string[] {
  return Array.isArray(project.technologies) ? project.technologies : []
}

/** H-22: list rows carry `feature_titles`; hidden when empty or missing. */
function featureTitles(project: Project): string[] {
  return Array.isArray(project.feature_titles) ? project.feature_titles.filter(Boolean).slice(0, 8) : []
}

/** Layout 1: dark feature panel with a parallax screenshot. */
function DarkPanel({ project }: { project: Project }) {
  const image = resolveMediaUrl(project.image)
  return (
    <section style={{ padding: '40px 0 140px' }}>
      <div className="wrap">
        <div className="tilt-in proj-luna" style={{ position: 'relative', overflow: 'clip', borderRadius: 36, background: 'linear-gradient(135deg, #160f3a 0%, #2a1a5e 55%, #4b2a8a 100%)', color: '#fff', padding: 'clamp(32px, 5vw, 72px)' }}>
          <Spark className="twinkle" style={twinkle({ position: 'absolute', left: '6%', top: '10%', width: 22, height: 22, color: '#8fd8ff' }, '.1s')} />
          <Spark className="twinkle" style={twinkle({ position: 'absolute', right: '4%', top: '8%', width: 30, height: 30, color: '#ff9ad1' }, '1.1s')} />
          <Spark className="twinkle" style={twinkle({ position: 'absolute', left: '44%', bottom: '8%', width: 18, height: 18, color: '#fff' }, '2s')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start', position: 'relative' }}>
            <h2 className="serif" style={H2}>{project.title}</h2>
            <p style={{ ...LEAD, color: '#e6dcff' }}>{project.description}</p>
            {technologies(project).length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {technologies(project).map((t) => <Chip key={t} dark>{t}</Chip>)}
              </div>
            )}
            <Button href={caseStudyHref(project)} variant="light" style={{ marginTop: 8 }}>
              Read the case study
            </Button>
          </div>
          {image && (
            <div className="shot parallax" style={{ position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={project.title} loading="lazy" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 18, boxShadow: '0 40px 80px -30px #000' }} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/** Layout 2: square indigo tile with the floating image, feature checklist and chips. */
function TileLayout({ project }: { project: Project }) {
  const image = resolveMediaUrl(project.image)
  const features = featureTitles(project)
  return (
    <section style={{ padding: '20px 0 150px' }}>
      <div className="wrap proj-inf">
        <div className="tilt-in" style={{ borderRadius: 36, background: 'linear-gradient(135deg, #1b1840, #3b2a7a)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'clip' }}>
          <Spark className="twinkle" style={twinkle({ position: 'absolute', left: '14%', top: '16%', width: 24, height: 24, color: '#6fe0ff' }, '.6s')} />
          <Spark className="twinkle" style={twinkle({ position: 'absolute', right: '14%', bottom: '18%', width: 28, height: 28, color: '#ff8ee0' }, '1.7s')} />
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="proj-float" src={image} alt={project.title} loading="lazy" style={{ width: '68%', height: 'auto' }} />
          )}
        </div>
        <div className="sv" style={{ display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'flex-start' }}>
          <h2 className="serif" style={H2}>{project.title}</h2>
          <p style={LEAD}>{project.description}</p>
          {features.length > 0 && (
            <ul className="proj-feat" style={{ fontSize: 'var(--t-meta)', fontWeight: 500 }}>
              {features.map((f) => (
                <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Spark size={16} style={{ color: 'var(--c1)', flex: 'none' }} />
                  {f}
                </li>
              ))}
            </ul>
          )}
          {technologies(project).length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {technologies(project).map((t) => <Chip key={t}>{t}</Chip>)}
            </div>
          )}
          <Button href={caseStudyHref(project)} style={{ marginTop: 6 }}>
            Read the case study
          </Button>
        </div>
      </div>
    </section>
  )
}

/** Layout 3: browser-frame screenshot with the copy above. */
function BrowserLayout({ project }: { project: Project }) {
  const image = resolveMediaUrl(project.image)
  let host = 'demitaylornimmo.com'
  try {
    if (project.live_url) host = new URL(project.live_url).host.replace(/^www\./, '')
  } catch {
    // keep the default label
  }
  return (
    <section style={{ padding: '20px 0 140px', background: 'linear-gradient(180deg, #fffafc 0%, #f5efff 100%)' }}>
      <div className="wrap">
        <div className="sv" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 32, flexWrap: 'wrap', marginBottom: 48 }}>
          <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <h2 className="serif" style={H2}>{project.title}</h2>
            <p style={{ ...LEAD, marginTop: 16 }}>{project.description}</p>
            <Button href={caseStudyHref(project)} style={{ marginTop: 22 }}>
              Read the case study
            </Button>
          </div>
          {technologies(project).length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {technologies(project).map((t) => <Chip key={t}>{t}</Chip>)}
            </div>
          )}
        </div>
        {image && (
          <div className="tilt-in shot" style={{ borderRadius: 24, overflow: 'clip', background: '#fff', boxShadow: '0 40px 80px -40px var(--b2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', background: '#f5efff' }} aria-hidden="true">
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff6b9d' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffc46b' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#6be3b0' }} />
              <span style={{ marginLeft: 14, padding: '4px 14px', borderRadius: 99, background: '#fff', fontSize: 'var(--t-sm)' }}>{host}</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={project.title} loading="lazy" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        )}
      </div>
    </section>
  )
}

const LAYOUTS = [DarkPanel, TileLayout, BrowserLayout]

export default function ProjectsClient({ projects }: { projects: Project[] }) {
  const { openContact } = useOverlay()
  return (
    <>
      <div className="under-header" style={{ background: 'linear-gradient(160deg, #f8f4ff 0%, #fff8f0 60%, #efe4ff 100%)' }}>
        <section className="wrap" style={{ paddingTop: 100, paddingBottom: 110, position: 'relative' }}>
          <Spark className="twinkle" style={twinkle({ position: 'absolute', right: '12%', top: 70, width: 30, height: 30, color: 'var(--c1)' }, '.2s')} />
          <h1 className="serif in" style={{ fontSize: 'clamp(52px, 6.4vw, 96px)', lineHeight: 1.05 }}>
            My{' '}
            <span className="script grad-text" style={{ fontSize: '1.15em', color: 'var(--c2)', paddingRight: '.1em' }}>
              projects
            </span>
          </h1>
          <p className="in" style={{ ['--d' as string]: '200ms', marginTop: 20, ...LEAD, maxWidth: '46ch' } as CSSProperties}>
            Things I’ve designed and built end to end, outside the day job: from the database to the last sparkle.
          </p>
        </section>
      </div>

      {projects.length === 0 ? (
        <section className="wrap" style={{ padding: '40px 24px 100px' }}>
          <p style={LEAD}>New projects are on the way. Check back soon.</p>
        </section>
      ) : (
        projects.map((project, i) => {
          const Layout = LAYOUTS[i % LAYOUTS.length]
          return <Layout key={project.id ?? project.slug} project={project} />
        })
      )}

      <section className="wrap sv" style={{ paddingTop: 40, paddingBottom: 100, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <h2 className="script" style={{ fontSize: 'clamp(48px, 6vw, 84px)', color: 'var(--c2)', lineHeight: 1.1 }}>
          Got a project in mind?
        </h2>
        <Button onClick={openContact}>Let’s talk</Button>
      </section>
    </>
  )
}
