import Link from 'next/link'
import { Fragment } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import Button from '@/components/ui/Button'
import Spark from '@/components/ui/Spark'
import Markdown, { extractToc } from '@/components/Markdown'
import ProcessTabs from '@/components/case-study/ProcessTabs'
import ShareMenu from '@/components/ShareMenu'
import { caseStudyToc, normaliseCaseStudy } from '@/components/case-study/caseStudy'
import { CASE_STUDY_HERO_ID } from '@/components/SiteHeader'
import type { Project } from '@/lib/api'
import { formatMonthYear } from '@/lib/format'
import { resolveMediaUrl } from '@/lib/mediaUrl'

const twinkle = (style: CSSProperties, d: string) => ({ ...style, ['--d' as string]: d }) as CSSProperties
const delay = (ms: number) => ({ ['--d' as string]: `${ms}ms` }) as CSSProperties
const H2: CSSProperties = { fontSize: 'var(--t-h2)' }
const COLUMN: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 24 }

function Section({ id, title, children, style }: { id: string; title?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <section id={id} className="sv" style={{ ...COLUMN, scrollMarginTop: 100, ...style }}>
      {title && <h2 className="serif" style={H2}>{title}</h2>}
      {children}
    </section>
  )
}

function Hero({ project, url }: { project: Project; url: string }) {
  const technologies = Array.isArray(project.technologies) ? project.technologies : []
  const meta = [
    { label: 'Role', value: project.role },
    { label: 'Stack', value: technologies.join(', ') },
    { label: 'Platform', value: project.platform },
    { label: 'Timeline', value: formatMonthYear(project.date, true) },
  ].filter((m) => typeof m.value === 'string' && m.value.trim())
  const image = resolveMediaUrl(project.image)

  return (
    <section
      id={CASE_STUDY_HERO_ID}
      style={{ position: 'relative', overflow: 'clip', background: 'linear-gradient(160deg, #160f3a 0%, #2a1a5e 55%, #4b2a8a 100%)', color: '#fff', paddingBottom: image ? 0 : 96 }}
    >
      <Spark className="twinkle" style={twinkle({ position: 'absolute', left: '8%', top: '18%', width: 22, height: 22, color: '#8fd8ff' }, '.1s')} />
      <Spark className="twinkle" style={twinkle({ position: 'absolute', right: '9%', top: '12%', width: 30, height: 30, color: '#ff9ad1' }, '1.1s')} />
      <Spark className="twinkle" style={twinkle({ position: 'absolute', right: '30%', top: '36%', width: 16, height: 16, color: '#fff' }, '1.9s')} />
      <div className="wrap" style={{ paddingTop: 88, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <Link href="/projects" className="in" style={{ fontSize: 'var(--t-meta)', fontWeight: 600, color: '#e6dcff', textDecoration: 'none' }}>
          ← All projects
        </Link>
        <p className="in" style={{ ...delay(80), fontSize: 'var(--t-meta)', fontWeight: 600, color: '#f5d0fe' }}>Case study</p>
        <h1 className="serif in" style={{ ...delay(150), fontSize: 'clamp(56px, 8vw, 120px)', lineHeight: 1 }}>{project.title}</h1>
        {project.description && (
          <p className="in" style={{ ...delay(250), fontSize: 'var(--t-lead)', lineHeight: 1.6, maxWidth: '46ch', color: '#e6dcff' }}>{project.description}</p>
        )}
        <div className="in" style={{ ...delay(300), display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
          {project.live_url && (
            <Button href={project.live_url} variant="light" target="_blank" rel="noopener noreferrer">
              Visit the site
            </Button>
          )}
          <ShareMenu url={url} title={project.title} emailSubject={`${project.title}, a case study`} label="Share this case study" variant="dark" align={project.live_url ? 'start' : 'end'} />
        </div>
        {meta.length > 0 && (
          <dl className="in cs-meta" style={{ ...delay(350), width: '100%', maxWidth: 900, marginTop: 24, textAlign: 'left' }}>
            {meta.map((m) => (
              <div key={m.label}>
                <dt style={{ fontSize: 'var(--t-sm)', color: '#c4b5fd' }}>{m.label}</dt>
                <dd style={{ fontWeight: 600, marginTop: 4 }}>{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {image && (
        <div className="wrap cs-parallax" style={{ maxWidth: 1060, marginTop: 64, marginBottom: -120, position: 'relative', zIndex: 2 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={project.title} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 24, boxShadow: '0 50px 100px -40px #000' }} />
        </div>
      )}
    </section>
  )
}

function Toc({ items }: { items: { id: string; label: string }[] }) {
  if (!items.length) return <div className="cs-toc" aria-hidden="true" />
  return (
    <nav className="cs-toc" aria-label="On this page">
      <p style={{ fontSize: 'var(--t-sm)', fontWeight: 600, color: '#6b5a7e', padding: '0 14px 8px' }}>On this page</p>
      {items.map((item) => (
        <a key={item.id} className="cs-tocl" href={`#${item.id}`}>
          {item.label}
        </a>
      ))}
    </nav>
  )
}

function StructuredBody({ project }: { project: Project }) {
  const cs = normaliseCaseStudy(project.case_study)!
  const toc = caseStudyToc(cs)
  const has = new Set(toc.map((t) => t.id))
  const steps = cs.architecture.steps
  const archColumns = steps.flatMap((_, i) => (i === 0 ? ['minmax(0,1fr)'] : ['60px', 'minmax(0,1fr)'])).join(' ')

  return (
    <>
      <Toc items={toc} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 110, minWidth: 0 }}>
        {has.has('overview') && (
          <Section id="overview" title="Overview" style={{ gap: 20 }}>
            <Markdown variant="lead">{cs.overview}</Markdown>
          </Section>
        )}
        {has.has('problem') && (
          <section id="problem" className={cs.howMightWe && cs.problem ? 'sv cs-two' : 'sv'} style={{ alignItems: 'center', scrollMarginTop: 100 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 className="serif" style={H2}>The problem</h2>
              <Markdown>{cs.problem}</Markdown>
            </div>
            {cs.howMightWe && (
              <blockquote style={{ margin: 0, padding: 32, borderRadius: 28, background: 'linear-gradient(135deg, #fdf2fb, #f1e8ff)', position: 'relative' }}>
                <Spark style={{ position: 'absolute', right: 22, top: -14, width: 30, height: 30, color: 'var(--c1)' }} />
                <p className="serif" style={{ fontSize: 28, lineHeight: 1.35, color: '#4c1d95' }}>{cs.howMightWe}</p>
              </blockquote>
            )}
          </section>
        )}
        {has.has('process') && (
          <Section id="process" title="Process">
            <ProcessTabs phases={cs.process} />
          </Section>
        )}
        {has.has('architecture') && (
          <Section id="architecture" title="Architecture">
            <Markdown>{cs.architecture.summary}</Markdown>
            {steps.length > 0 && (
              <div className="cs-arch" style={{ gridTemplateColumns: archColumns, background: 'linear-gradient(135deg, #160f3a, #4b2a8a)', borderRadius: 32, padding: 'clamp(24px, 4vw, 48px)', color: '#2d3436' }}>
                {steps.map((step, i) => (
                  <Fragment key={`${step.title}-${i}`}>
                    {i > 0 && (
                      <div className="cs-arrow cs-flow" aria-hidden="true" style={{ height: 4, margin: '0 10px', borderRadius: 4, background: 'repeating-linear-gradient(90deg, #f472b6 0 12px, transparent 12px 24px)' }} />
                    )}
                    <div className="cs-box">
                      <p style={{ color: 'var(--b2)' }}>{step.title}</p>
                      {step.detail && <p style={{ fontSize: 'var(--t-sm)', fontWeight: 400, marginTop: 6 }}>{step.detail}</p>}
                    </div>
                  </Fragment>
                ))}
              </div>
            )}
          </Section>
        )}
        {has.has('features') && (
          <Section id="features" title="Key features">
            <div className="cs-three">
              {cs.features.map((f, i) => {
                const image = resolveMediaUrl(f.image)
                return (
                  <div key={`${f.title}-${i}`} style={{ background: '#fff', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={f.imageAlt} loading="lazy" style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', borderRadius: 24, display: 'block' }} />
                    )}
                    <h3 style={{ fontSize: 18, fontWeight: 600 }}>{f.title}</h3>
                    <div style={{ fontSize: 'var(--t-meta)' }}>
                      <Markdown>{f.body}</Markdown>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}
        {has.has('challenges') && (
          <Section id="challenges" title="Challenges">
            <div className="cs-two">
              {cs.challenges.map((c, i) => (
                <div key={`${c.title}-${i}`} style={{ background: '#fff', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 'var(--t-sm)', fontWeight: 600, color: '#c2185b' }}>Challenge</p>
                  <h3 style={{ fontSize: 20, fontWeight: 600 }}>{c.title}</h3>
                  {c.solution && (
                    <div className="cs-solution" style={{ fontSize: 'var(--t-meta)', lineHeight: 1.65 }}>
                      <strong style={{ color: 'var(--b2)' }}>Solution:</strong> <Markdown>{c.solution}</Markdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
        {has.has('outcome') && (
          <Section id="outcome" title="Outcome">
            {cs.metrics.length > 0 && (
              <div className="cs-three">
                {cs.metrics.map((m, i) => (
                  <div key={`${m.value}-${i}`} className="cs-metric" style={{ background: 'linear-gradient(135deg, #fdf2fb, #f1e8ff)', borderRadius: 24, padding: 28 }}>
                    <p className="serif" style={{ fontSize: 44, color: 'var(--b2)' }}>{m.value}</p>
                    <p style={{ fontSize: 'var(--t-meta)' }}>{m.label}</p>
                  </div>
                ))}
              </div>
            )}
            {cs.learned && (
              <div style={{ background: '#fff', borderRadius: 28, padding: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 className="script" style={{ fontSize: 40, color: 'var(--b2)' }}>What I learned</h3>
                <Markdown>{cs.learned}</Markdown>
              </div>
            )}
          </Section>
        )}
        <Extras project={project} />
      </div>
    </>
  )
}

/** Unconverted projects: the legacy Markdown `content` in the same styles. */
function LegacyBody({ project }: { project: Project }) {
  const content = typeof project.content === 'string' ? project.content : ''
  return (
    <>
      <Toc items={extractToc(content)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 64, minWidth: 0 }}>
        {content ? <Markdown>{content}</Markdown> : <p style={{ fontSize: 'var(--t-lead)' }}>The full write-up is on its way.</p>}
        <Extras project={project} />
      </div>
    </>
  )
}

function Extras({ project }: { project: Project }) {
  const gallery = (Array.isArray(project.images) ? project.images : []).map(resolveMediaUrl).filter(Boolean)
  return (
    <>
      {gallery.length > 0 && (
        <section id="gallery" className="sv" style={COLUMN} aria-labelledby="gallery-title">
          <h2 id="gallery-title" className="serif" style={H2}>Gallery</h2>
          <div className="cs-three">
            {gallery.map((src, i) => (
              <div key={src} style={{ background: '#fff', borderRadius: 24, padding: 16 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${project.title} screenshot ${i + 1}`} loading="lazy" style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', borderRadius: 18, display: 'block' }} />
              </div>
            ))}
          </div>
        </section>
      )}
      {(project.github_url || project.live_url) && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {project.live_url && <Button href={project.live_url}>See it live</Button>}
          {project.github_url && (
            <Button href={project.github_url} variant="line">
              View on GitHub
            </Button>
          )}
        </div>
      )}
    </>
  )
}

export default function ProjectDetailsClient({ project, next, url }: { project: Project; next?: Project | null; url: string }) {
  const structured = normaliseCaseStudy(project.case_study) !== null
  const nextImage = next ? resolveMediaUrl(next.image) : ''
  return (
    <div className="cs">
      <Hero project={project} url={url} />
      <div className="wrap cs-body" style={{ paddingTop: project.image ? 200 : 96, paddingBottom: 100 }}>
        {structured ? <StructuredBody project={project} /> : <LegacyBody project={project} />}
      </div>
      {next && (
        <Link href={`/projects/${next.slug}`} style={{ display: 'block', textDecoration: 'none', background: 'linear-gradient(135deg, #1b1840, #3b2a7a)', color: '#fff' }}>
          <div className="wrap" style={{ paddingTop: 90, paddingBottom: 90, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 'var(--t-meta)', color: '#c4b5fd' }}>Next project</p>
              <p className="serif" style={{ fontSize: 'clamp(44px, 6vw, 88px)', lineHeight: 1.05 }}>{next.title}</p>
            </div>
            {nextImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={nextImage} alt="" loading="lazy" style={{ width: 200, height: 'auto' }} />
            )}
          </div>
        </Link>
      )}
    </div>
  )
}
