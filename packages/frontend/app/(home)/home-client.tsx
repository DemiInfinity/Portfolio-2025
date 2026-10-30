'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { ArrowIcon } from '@/components/ui/IconButton'
import Spark from '@/components/ui/Spark'
import PageError from '@/components/PageError'
import type { Project } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { useFeatureFlag } from '@/lib/useFeatureFlag'
import { useResumeAvailability } from '@/lib/useResumeAvailability'
import { useLocalStorage } from '@/lib/useClientStore'
import { colourways, contact, homeContact, homeHero, homeTeaser, marquee, person } from '@/lib/content/site'
import type { Colourway } from '@/lib/content/site'

export const COLOURWAY_KEY = 'home_colourway'
const TOKENS = ['c1', 'c2', 'b1', 'b2', 'soft'] as const

export type HomeStats = {
  years: string
  degree: { value: string; label: string }
}

/**
 * D-3: the colourway applies to the home page only. The header sits in the
 * home hero, so the tokens go on <body> while Home is mounted and are removed
 * when you leave, so every other page stays Lilac. Remembered (optional) in
 * localStorage under `home_colourway`.
 */
function useColourway(enabled: boolean) {
  const [stored, setStored] = useLocalStorage(COLOURWAY_KEY)
  const [picked, setPicked] = useState<number | null>(null)
  const storedIndex = colourways.findIndex((c) => c.name === stored)
  // Flag off: always Lilac, and any remembered choice is ignored.
  const index = enabled ? picked ?? (storedIndex >= 0 ? storedIndex : 0) : 0

  useEffect(() => {
    const way: Colourway = colourways[index]
    const style = document.body.style
    if (index === 0) TOKENS.forEach((t) => style.removeProperty(`--${t}`))
    else TOKENS.forEach((t) => style.setProperty(`--${t}`, way[t]))
  }, [index])

  useEffect(
    () => () => {
      TOKENS.forEach((t) => document.body.style.removeProperty(`--${t}`))
    },
    []
  )

  const pick = (next: number) => {
    setPicked(next)
    setStored(next === 0 ? null : colourways[next].name)
  }

  return [index, pick] as const
}

const twinkle = (style: CSSProperties, delay: string) => ({ ...style, ['--d' as string]: delay }) as CSSProperties
const delay = (ms: number) => ({ ['--d' as string]: `${ms}ms` }) as CSSProperties

const LAYER_ROW: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  background: 'rgba(255,255,255,.08)',
  padding: '10px 12px',
  borderRadius: 10,
  fontSize: 13,
}

function Stack() {
  return (
    <div className="float hero-stage" role="img" aria-label={homeHero.illustrationLabel} style={{ paddingTop: 60 }}>
      <div className="hero-stack hero-explode">
        <div className="hero-layer db" style={{ background: '#2d1b2e', padding: 26, display: 'flex', flexDirection: 'column', gap: 10, color: '#ffd6e8' }}>
          <div className="mono" style={{ fontSize: 13, opacity: 0.75 }}>postgres · demi_db</div>
          <div className="mono" style={LAYER_ROW}><span>projects</span><span>3 rows</span></div>
          <div className="mono" style={LAYER_ROW}><span>characters</span><span>lore</span></div>
          <div className="mono" style={LAYER_ROW}><span>sprints</span><span>issues</span></div>
          <div className="mono" style={LAYER_ROW}><span>sparkles</span><span>∞</span></div>
        </div>
        <div className="hero-layer api" style={{ background: 'rgba(255,255,255,.7)', border: '2px solid rgba(255,255,255,.95)', padding: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="mono" style={{ fontSize: 13, color: 'var(--b2)', fontWeight: 500 }}>api · node + express</div>
          <div className="mono" style={{ fontSize: 14, display: 'flex', gap: 10 }}><span style={{ background: '#1f9e6e', color: '#fff', padding: '2px 8px', borderRadius: 6 }}>GET</span>/projects</div>
          <div className="mono" style={{ fontSize: 14, display: 'flex', gap: 10 }}><span style={{ background: 'var(--b1)', color: '#fff', padding: '2px 8px', borderRadius: 6 }}>POST</span>/lore</div>
          <div className="mono" style={{ fontSize: 14, display: 'flex', gap: 10 }}><span style={{ background: '#5b4bd6', color: '#fff', padding: '2px 8px', borderRadius: 6 }}>PUT</span>/sprints/:id</div>
          <div className="mono" style={{ fontSize: 13, opacity: 0.65, marginTop: 'auto' }}>200 OK · 42ms</div>
        </div>
        <div className="hero-layer ui" style={{ background: '#ffffff', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" style={{ height: 24, width: 'auto' }} />
            <span style={{ width: 46, height: 10, borderRadius: 99, background: 'var(--soft)' }} />
          </div>
          <div className="script" style={{ fontSize: 34, lineHeight: 1, color: 'var(--c2)' }}>Hello, world</div>
          <div style={{ height: 56, borderRadius: 14, background: 'linear-gradient(45deg, var(--c1), var(--c2))', opacity: 0.9 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ flex: 1, height: 54, borderRadius: 12, background: '#f8f4ff' }} />
            <span style={{ flex: 1, height: 54, borderRadius: 12, background: '#fff0f5' }} />
          </div>
          <span style={{ alignSelf: 'flex-start', padding: '8px 16px', borderRadius: 99, background: 'var(--b2)', color: '#fff', fontSize: 13, fontWeight: 600 }}>Hire me</span>
        </div>
      </div>
    </div>
  )
}

const CALLOUT_POSITIONS: CSSProperties[] = [
  { position: 'absolute', right: 0, top: '7%', maxWidth: 220 },
  { position: 'absolute', left: '-2%', bottom: '30%', maxWidth: 200 },
  { position: 'absolute', right: '4%', bottom: '6%', maxWidth: 210 },
]

function WorkCard({ project, position }: { project: Project; position: number }) {
  const image = resolveMediaUrl(project.image)
  const href = `/projects/${project.slug}`
  const title = (
    <h3 className="serif" style={{ fontSize: 28 }}>
      {project.title}
    </h3>
  )
  if (position === 0) {
    return (
      <Link href={href} className="wcard tilt-in" style={{ textDecoration: 'none', borderRadius: 28, overflow: 'clip', background: '#1e1446', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        {image && (
          <div style={{ overflow: 'clip', padding: '18px 18px 0' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="wcard-img" src={image} alt={project.title} loading="lazy" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 14 }} />
          </div>
        )}
        <div style={{ padding: '24px 26px 28px' }}>
          {title}
          <p style={{ marginTop: 8, fontSize: 'var(--t-meta)', lineHeight: 1.6, color: '#e6dcff' }}>{project.description}</p>
        </div>
      </Link>
    )
  }
  if (position === 1) {
    return (
      <Link href={href} className="wcard tilt-in" style={{ textDecoration: 'none', borderRadius: 28, overflow: 'clip', background: 'linear-gradient(135deg, #1b1840, #3b2a7a)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28, minHeight: 200 }}>
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="wcard-img float" src={image} alt={project.title} loading="lazy" style={{ width: '62%', height: 'auto' }} />
          )}
        </div>
        <div style={{ padding: '0 26px 28px' }}>
          {title}
          <p style={{ marginTop: 8, fontSize: 'var(--t-meta)', lineHeight: 1.6, color: '#e6dcff' }}>{project.description}</p>
        </div>
      </Link>
    )
  }
  return (
    <Link href={href} className="wcard tilt-in" style={{ textDecoration: 'none', borderRadius: 28, overflow: 'clip', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {image && (
        <div style={{ overflow: 'clip', padding: '14px 14px 0' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="wcard-img" src={image} alt={project.title} loading="lazy" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 14 }} />
        </div>
      )}
      <div style={{ padding: '24px 26px 28px' }}>
        {title}
        <p style={{ marginTop: 8, fontSize: 'var(--t-meta)', lineHeight: 1.6 }}>{project.description}</p>
      </div>
    </Link>
  )
}

export default function HomeClient({
  projects,
  projectsUnavailable = false,
  stats,
  showColourways = false,
}: {
  projects: Project[]
  projectsUnavailable?: boolean
  stats?: HomeStats
  /** `show_colourways` flag, read on the server. */
  showColourways?: boolean
}) {
  const router = useRouter()
  const { enabled: openToWork, isLoading: flagLoading } = useFeatureFlag('open_to_work')
  const { available: resumeAvailable, url: resumeUrl } = useResumeAvailability()
  const [cw, setCw] = useColourway(showColourways)
  const way = colourways[cw]

  const years = stats?.years ?? homeTeaser.yearsStat
  const degree = stats?.degree ?? { value: homeTeaser.degreeStat, label: homeTeaser.degreeLabel }

  return (
    <>
      {/* HERO */}
      <section
        id="top"
        className="under-header"
        style={{ position: 'relative', overflow: 'clip', background: `linear-gradient(160deg, #f8f4ff 0%, #fff8f0 50%, ${way.soft} 100%)`, transition: 'background 900ms ease' }}
      >
        <div className="blob" aria-hidden="true" style={{ width: 520, height: 520, left: -160, top: 120, background: 'var(--c1)' }} />
        <div className="blob" aria-hidden="true" style={{ width: 420, height: 420, right: -120, top: 320, background: '#b9a6ff', animationDelay: '-6s' }} />

        <Spark className="twinkle" style={twinkle({ position: 'absolute', left: '4%', top: '22%', width: 24, height: 24, color: 'var(--c1)' }, '0s')} />
        <Spark className="twinkle hide-sm" style={twinkle({ position: 'absolute', left: '47%', top: '14%', width: 18, height: 18, color: '#b9a6ff' }, '.9s')} />
        <Spark className="twinkle" style={twinkle({ position: 'absolute', right: '5%', top: '16%', width: 28, height: 28, color: 'var(--c1)' }, '1.6s')} />
        <Spark className="twinkle hide-sm" style={twinkle({ position: 'absolute', right: '36%', bottom: '10%', width: 22, height: 22, color: 'var(--c2)' }, '.4s')} />

        <div className="wrap home-hero-grid hero-pad" style={{ position: 'relative', zIndex: 2, minHeight: 780 }}>
          <div className="hero-copy" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 22 }}>
            <h1 style={{ lineHeight: 1 }}>
              <span className="mask serif" style={{ fontSize: 'clamp(44px, 5.4vw, 80px)' }}>
                <span style={delay(100)}>{homeHero.greeting}</span>
              </span>{' '}
              <span className="mask script" style={{ fontSize: 'clamp(54px, 7.4vw, 112px)', lineHeight: 1.15 }}>
                <span className="grad-text" style={{ ...delay(260), color: 'var(--c2)', paddingRight: '.15em' }}>
                  {person.name}
                </span>
              </span>
            </h1>
            {openToWork && !flagLoading && (
              <span
                className="in"
                style={{ ...delay(500), display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99, background: '#fff', fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--b2)' }}
              >
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#1f9e6e' }} />
                {homeHero.openToWork}
              </span>
            )}
            <p className="in" style={{ ...delay(600), fontSize: 'var(--t-lead)', lineHeight: 1.5, maxWidth: '30ch', fontWeight: 500 }}>
              {homeHero.lead}
            </p>
            <div className="in hero-actions" style={{ ...delay(750), display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Button href="/projects">
                {homeHero.primaryCta} <ArrowIcon />
              </Button>
              <Button href="/experience" variant="line">
                {homeHero.secondaryCta}
              </Button>
            </div>
            {showColourways && (
            <div className="in" style={{ ...delay(900), display: 'flex', alignItems: 'center', gap: 14, marginTop: 8, fontSize: 'var(--t-sm)', fontWeight: 500 }}>
              <span id="cw-label">Colourway: {way.name}</span>
              <div role="group" aria-labelledby="cw-label" style={{ display: 'flex', gap: 10 }}>
                {colourways.map((c, k) => (
                  <button
                    key={c.name}
                    type="button"
                    className="swatch"
                    aria-pressed={k === cw}
                    aria-label={c.name}
                    onClick={() => setCw(k)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      border: '3px solid #fff',
                      padding: 0,
                      cursor: 'pointer',
                      background: `linear-gradient(45deg, ${c.c1}, ${c.c2})`,
                      outline: k === cw ? `2px solid ${c.b2}` : '2px solid transparent',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>
            )}
          </div>

          <div className="in product-col" style={{ ...delay(200), position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 680 }}>
            <div
              aria-hidden="true"
              className="bigword serif hide-sm"
              style={{ position: 'absolute', left: '50%', top: '54%', transform: 'translate(-50%, -50%)', fontSize: '11vw', fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap', color: 'transparent', WebkitTextStroke: '2px var(--c1)', opacity: 0.2, letterSpacing: '-.03em' }}
            >
              FULL STACK
            </div>
            <div className="stack-shadow" aria-hidden="true" style={{ position: 'absolute', bottom: 60, width: '58%', height: 44, borderRadius: '50%', background: 'var(--c2)', filter: 'blur(28px)' }} />
            <Stack />
            {homeHero.callouts.map((callout, i) => (
              <div key={callout.title} className="callout hide-sm" style={CALLOUT_POSITIONS[i]}>
                <strong style={{ display: 'block', color: 'var(--b2)' }}>{callout.title}</strong>
                {callout.body}
              </div>
            ))}
            <div className="stack-chips" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12, fontSize: 'var(--t-sm)', fontWeight: 500 }}>
              {homeHero.chips.map((chip) => (
                <span key={chip} style={{ background: '#fff', padding: '6px 12px', borderRadius: 99 }}>
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE: the band is 40px wider than the page and rotated, so its
          wrapper clips it horizontally (vertical overflow stays visible). */}
      <div className="marquee-clip">
      <div aria-hidden="true" style={{ background: 'linear-gradient(45deg, var(--b1), var(--b2))', color: '#fff', overflow: 'clip', padding: '16px 0', transform: 'rotate(-1.5deg)', margin: '-10px -20px 0', position: 'relative', zIndex: 3 }}>
        <div className="marquee" style={{ gap: 40, fontWeight: 600, fontSize: 20, whiteSpace: 'nowrap', alignItems: 'center' }}>
          {[0, 1].map((copy) =>
            marquee.map((item) => [
              <span key={`${copy}-${item}`}>{item}</span>,
              <span key={`${copy}-${item}-s`}>✦</span>,
            ])
          )}
        </div>
      </div>
      </div>

      {/* RECENT WORK */}
      <section style={{ padding: '150px 0 120px' }}>
        <div className="wrap">
          <div className="sv" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', marginBottom: 56 }}>
            <h2 className="serif" style={{ fontSize: 'var(--t-h2)', lineHeight: 1.05 }}>
              Recent{' '}
              <span className="script grad-text" style={{ fontSize: '1.15em', color: 'var(--c2)' }}>
                work
              </span>
            </h2>
            <Button href="/projects" variant="line">
              All projects
            </Button>
          </div>
          {projectsUnavailable ? (
            <PageError
              inline
              headingLevel={3}
              title="Couldn’t load recent work"
              message="The server naps when nobody’s around. Give it a few seconds, then try again."
              retryLabel="Retry"
              reset={() => router.refresh()}
            />
          ) : projects.length === 0 ? (
            <p style={{ fontSize: 'var(--t-lead)' }}>New projects are on the way.</p>
          ) : (
            <div className="home-cards">
              {projects.map((project, i) => (
                <WorkCard key={project.id ?? project.slug} project={project} position={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ABOUT TEASER */}
      <section style={{ padding: '60px 0 140px' }}>
        <div className="wrap home-split">
          <div className="tilt-in" style={{ position: 'relative', justifySelf: 'center', width: 'min(360px, 80vw)' }}>
            <div style={{ background: '#fff', padding: '12px 12px 18px', borderRadius: 28, transform: 'rotate(-3deg)', boxShadow: '0 30px 60px -30px var(--b2)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/demi-portrait.jpg" alt={homeTeaser.portraitAlt} width={803} height={1000} loading="lazy" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 20 }} />
              <p className="script" style={{ textAlign: 'center', fontSize: 30, marginTop: 8, color: 'var(--c2)' }}>
                {homeTeaser.caption}
              </p>
            </div>
            <Spark className="twinkle" style={twinkle({ position: 'absolute', right: -14, top: -12, width: 40, height: 40, color: 'var(--c1)' }, '.2s')} />
            <Spark className="twinkle" style={twinkle({ position: 'absolute', left: -18, bottom: 60, width: 26, height: 26, color: '#b9a6ff' }, '1.2s')} />
          </div>
          <div className="sv" style={{ display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'flex-start' }}>
            <h2 className="serif" style={{ fontSize: 'var(--t-h2)', lineHeight: 1.05 }}>
              {homeTeaser.titleStart}{' '}
              <span className="script grad-text" style={{ fontSize: '1.15em', color: 'var(--c2)' }}>
                {homeTeaser.titleScript}
              </span>
            </h2>
            <p style={{ fontSize: 'var(--t-lead)', lineHeight: 1.6, maxWidth: '46ch' }}>{homeTeaser.body}</p>
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBlock: 8 }}>
              {[
                { value: years, label: homeTeaser.yearsLabel },
                { value: homeTeaser.librariesStat, label: homeTeaser.librariesLabel },
                { value: degree.value, label: degree.label },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="serif" style={{ fontSize: 44, color: 'var(--b2)' }}>{stat.value}</p>
                  <p style={{ fontSize: 'var(--t-meta)' }}>{stat.label}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Button href="/about">More about me</Button>
              <Button href="/experience" variant="line">
                My experience
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section style={{ padding: '0 0 100px' }}>
        <div className="wrap">
          <div className="sv" style={{ position: 'relative', overflow: 'clip', borderRadius: 36, background: 'linear-gradient(135deg, var(--c1) 0%, var(--b1) 50%, var(--b2) 100%)', color: '#fff', padding: 'clamp(40px, 7vw, 96px)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
            <Spark className="twinkle" style={twinkle({ position: 'absolute', left: '8%', top: '18%', width: 34, height: 34, color: '#fff' }, '.3s')} />
            <Spark className="twinkle" style={twinkle({ position: 'absolute', right: '10%', bottom: '20%', width: 26, height: 26, color: '#fff' }, '1.4s')} />
            <h2 className="script" style={{ fontSize: 'clamp(52px, 7vw, 100px)', lineHeight: 1.05 }}>{homeContact.title}</h2>
            <p style={{ fontSize: 'var(--t-lead)', lineHeight: 1.6, maxWidth: '44ch' }}>{homeContact.body}</p>
            <a href={`mailto:${contact.email}`} className="btn" style={{ background: '#fff', color: 'var(--b2)' }}>
              {contact.email}
            </a>
            {resumeAvailable && resumeUrl && (
              <a href={resumeUrl} download className="btn" style={{ background: 'rgba(255,255,255,.16)', color: '#fff', border: '2px solid rgba(255,255,255,.7)' }}>
                Download CV
              </a>
            )}
            <div style={{ display: 'flex', gap: 22, fontWeight: 500 }}>
              <a href={contact.github}>GitHub</a>
              <a href={contact.linkedin}>LinkedIn</a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
