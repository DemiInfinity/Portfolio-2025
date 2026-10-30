'use client'

import Link from 'next/link'
import { useEffect, useId, useState } from 'react'
import type { CSSProperties } from 'react'
import Button from '@/components/ui/Button'
import IconButton, { CloseIcon } from '@/components/ui/IconButton'
import Spark from '@/components/ui/Spark'
import Markdown from '@/components/Markdown'
import Modal from '@/components/overlays/Modal'
import { useOverlay } from '@/components/overlays/OverlayProvider'
import {
  CourseCard,
  FutureGoals,
  ProgressBar,
  SkillsMastered,
  inProgress,
  masteredSkills,
  progressLabel,
} from '@/components/learning/learning'
import type { AboutContent, BlogPost, Certification, LearningItem, Recommendation, Skill } from '@/lib/api'
import { formatLongDate, formatMonthYear } from '@/lib/format'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { useResumeAvailability } from '@/lib/useResumeAvailability'
import { usePrefersReducedMotion } from '@/lib/useClientStore'
import { aboutPage, contact, futureGoals } from '@/lib/content/site'

const tw = (style: CSSProperties, d: string) => ({ ...style, ['--d' as string]: d }) as CSSProperties
const delay = (ms: number) => ({ ['--d' as string]: `${ms}ms` }) as CSSProperties
const H2: CSSProperties = { fontSize: 'var(--t-h2)', lineHeight: 1.05 }
const CARD_H2: CSSProperties = { fontSize: 'clamp(30px, 2.8vw, 40px)' }

function ScriptWord({ children }: { children: string }) {
  return (
    <span className="script grad-text" style={{ fontSize: '1.15em', color: 'var(--c2)', paddingRight: '.1em' }}>
      {children}
    </span>
  )
}

/** Types the code card out at 45ms per character; under reduced motion it shows at once. */
function useTyping(text: string) {
  const reduce = usePrefersReducedMotion()
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (reduce) return
    const timer = setInterval(() => {
      setCount((n) => {
        if (n + 1 >= text.length) clearInterval(timer)
        return Math.min(text.length, n + 1)
      })
    }, 45)
    return () => clearInterval(timer)
  }, [text, reduce])
  return reduce ? text : text.slice(0, count)
}

function CodeCard() {
  const typed = useTyping(aboutPage.code)
  return (
    <div className="sv" style={{ background: '#2d1b2e', borderRadius: 24, overflow: 'clip', boxShadow: '0 40px 80px -40px var(--b2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', background: '#24152a' }} aria-hidden="true">
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff6b9d' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffc46b' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#6be3b0' }} />
        <span className="mono" style={{ marginLeft: 12, fontSize: 13, color: '#d9bfd2' }}>demi.ts</span>
      </div>
      <pre
        className="mono"
        aria-label={aboutPage.codeLabel}
        style={{ margin: 0, padding: '26px 24px 30px', fontSize: 'clamp(13px, 1.1vw, 15px)', lineHeight: 1.75, color: '#ffe3ef', whiteSpace: 'pre-wrap', minHeight: 380 }}
      >
        {typed}
        <span className="caret" aria-hidden="true" />
      </pre>
    </div>
  )
}

function LookingFor({ about, openToWork }: { about: AboutContent; openToWork: boolean }) {
  const { openContact } = useOverlay()
  const { available, url } = useResumeAvailability()
  const lf = about.looking_for
  if (!openToWork) {
    return (
      <section id="looking-for" style={{ padding: '0 0 20px' }}>
        <div className="wrap">
          <div className="sv" style={{ borderRadius: 28, background: '#fff', padding: '28px 32px', display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <p className="script" style={{ fontSize: 'clamp(30px, 3vw, 40px)', color: 'var(--b2)', lineHeight: 1.15 }}>{about.open_to_work_off_line}</p>
            <Button onClick={openContact}>Get in touch</Button>
          </div>
        </div>
      </section>
    )
  }
  const items = lf?.items ?? []
  return (
    <section id="looking-for" style={{ padding: '0 0 20px' }}>
      <div className="wrap">
        <div className="sv lf" style={{ position: 'relative', overflow: 'clip', borderRadius: 36, background: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 60%, #6d28d9 100%)', color: '#fff', padding: 'clamp(32px, 5vw, 64px)' }}>
          <Spark className="twinkle" style={tw({ position: 'absolute', right: '6%', top: '14%', width: 30, height: 30, color: '#f9a8d4' }, '.3s')} />
          <Spark className="twinkle" style={tw({ position: 'absolute', right: '18%', bottom: '16%', width: 18, height: 18, color: '#fff' }, '1.5s')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h2 className="serif" style={{ fontSize: 'clamp(36px, 3.6vw, 54px)', lineHeight: 1.05 }}>
              What I’m{' '}
              <span className="script" style={{ fontSize: '1.15em', color: '#f9a8d4', whiteSpace: 'nowrap' }}>looking for</span>
            </h2>
            {lf?.summary && <p style={{ fontSize: 'var(--t-lead)', lineHeight: 1.65, maxWidth: '44ch', color: '#ede4ff' }}>{lf.summary}</p>}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <button type="button" className="btn" onClick={openContact} style={{ background: '#fff', color: '#4c1d95' }}>
                Hire me
              </button>
              {available && url && (
                <a className="btn" href={url} download style={{ border: '2px solid rgba(255,255,255,.6)', color: '#fff' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
                  </svg>
                  Download CV
                </a>
              )}
            </div>
          </div>
          {items.length > 0 && (
            <ul className="lf-list">
              {items.map((item) => (
                <li key={`${item.label}-${item.value}`}>
                  <span className="lf-k">{item.label}</span>
                  <span>{item.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function LearningModal({ courses, skills, onClose }: { courses: LearningItem[]; skills: Skill[]; onClose: () => void }) {
  const titleId = useId()
  return (
    <Modal labelledBy={titleId} onClose={onClose} panelStyle={{ maxWidth: 760 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fff', padding: '28px 32px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h2 id={titleId} className="serif" style={{ fontSize: 34 }}>
            My learning <ScriptWord>journey</ScriptWord>
          </h2>
          <p style={{ fontSize: 'var(--t-meta)', marginTop: 6 }}>
            {courses.length} courses in progress · {skills.length} skills mastered · {futureGoals.length} goals ahead
          </p>
        </div>
        <IconButton aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>
      <div className="ov-stagger" style={{ padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {courses.map((c) => (
          <CourseCard key={c.id ?? c.title} item={c} />
        ))}
        <div className="ab-two" style={{ gap: 14, marginTop: 6 }}>
          {skills.length > 0 && <SkillsMastered skills={skills} />}
          <FutureGoals />
        </div>
      </div>
    </Modal>
  )
}

function CurrentlyLearning({ learning, skills }: { learning: LearningItem[]; skills: Skill[] }) {
  const [open, setOpen] = useState(false)
  const courses = inProgress(learning)
  return (
    <div className="sv" style={{ background: '#fff', borderRadius: 32, padding: 'clamp(24px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <h2 className="serif" style={CARD_H2}>
        Currently <ScriptWord>learning</ScriptWord>
      </h2>
      {courses.length === 0 ? (
        <p style={{ fontSize: 'var(--t-meta)' }}>Nothing in progress right now.</p>
      ) : (
        courses.slice(0, 4).map((c) => (
          <div key={c.id ?? c.title} className="learn">
            <div className="learn-top">
              <span>{c.title}</span>
              <span>{progressLabel(c)}</span>
            </div>
            <ProgressBar item={c} />
          </div>
        ))
      )}
      <Button onClick={() => setOpen(true)} style={{ alignSelf: 'flex-start' }}>
        See all courses
      </Button>
      {open && <LearningModal courses={courses} skills={masteredSkills(skills)} onClose={() => setOpen(false)} />}
    </div>
  )
}

function LatestWriting({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="sv" style={{ background: '#fff', borderRadius: 32, padding: 'clamp(24px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h2 className="serif" style={CARD_H2}>
        Latest <ScriptWord>writing</ScriptWord>
      </h2>
      {posts.map((post) => {
        const cover = resolveMediaUrl(post.cover_image)
        const meta = [post.category, formatLongDate(post.publish_date || post.created_at)].filter(Boolean).join(' · ')
        return (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="write-row">
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" loading="lazy" style={{ width: 120, height: 84, objectFit: 'cover', borderRadius: 14, flex: 'none' }} />
            )}
            <div>
              {meta && <p style={{ fontSize: 'var(--t-sm)', color: '#6b5a7e' }}>{meta}</p>}
              <p style={{ fontWeight: 600, lineHeight: 1.4, marginTop: 4 }}>{post.title}</p>
            </div>
          </Link>
        )
      })}
      <Link href="/blog" style={{ fontWeight: 600, color: 'var(--b2)', marginTop: 'auto' }}>
        All posts
      </Link>
    </div>
  )
}

function Certifications({ items }: { items: Certification[] }) {
  return (
    <section id="certifications" style={{ padding: '140px 0 0' }}>
      <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <h2 className="serif sv" style={CARD_H2}>Certifications</h2>
        <div className="grid-3">
          {items.map((c) => {
            const year = /^(\d{4})/.exec(c.issue_date || '')?.[1]
            return (
              <div key={c.id ?? c.name} className="ab-course sv" style={{ background: '#fff' }}>
                <p style={{ fontWeight: 600, lineHeight: 1.4 }}>{c.name}</p>
                {(c.issuer || year) && <p className="course-meta">{[c.issuer, year].filter(Boolean).join(', ')}</p>}
                {c.credential_url && (
                  <a href={c.credential_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: 'var(--b2)', fontSize: 'var(--t-meta)' }}>
                    Check credential
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/** "Team lead at 3T Global · managed Demi directly", missing parts dropped. */
export function recommendationRole(r: Recommendation): string {
  const job = [r.role, r.company].filter(Boolean).join(' at ')
  return [job, r.relationship].filter(Boolean).join(' · ')
}

/** "LinkedIn recommendation, January 2025". */
export function recommendationSource(r: Recommendation): string {
  const when = formatMonthYear(r.date, true)
  if (r.source && when) return `${r.source} recommendation, ${when}`
  if (r.source) return `${r.source} recommendation`
  return when
}

function KindWords({ items }: { items: Recommendation[] }) {
  const [index, setIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const rec = items[index]
  const role = recommendationRole(rec)
  const source = recommendationSource(rec)
  const go = (step: number) => {
    setExpanded(false)
    setIndex((i) => (i + step + items.length) % items.length)
  }
  return (
    <div className="sv" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <h2 className="serif" style={H2}>
        Kind <ScriptWord>words</ScriptWord>
      </h2>
      <figure className="ab-quote" aria-live="polite" style={{ padding: 'clamp(28px, 3.4vw, 44px)', gap: 20, position: 'relative' }}>
        <Spark style={{ position: 'absolute', right: 26, top: -16, width: 36, height: 36, color: 'var(--c1)' }} />
        <blockquote style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="serif" style={{ fontSize: 'clamp(22px, 2vw, 28px)', lineHeight: 1.4, color: '#4c1d95' }}>“{rec.quote}”</p>
          {expanded && rec.full_text && (
            <div className="rec-full">
              <Markdown>{rec.full_text}</Markdown>
            </div>
          )}
        </blockquote>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <figcaption style={{ fontSize: 'var(--t-meta)', lineHeight: 1.5 }}>
            <strong>{rec.name}</strong>
            {role && (
              <>
                <br />
                {role}
              </>
            )}
            {source && (
              <>
                <br />
                <span style={{ fontSize: 'var(--t-sm)', color: '#6b5a7e' }}>{source}</span>
              </>
            )}
          </figcaption>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {rec.full_text && (
              <button type="button" className="btn btn-soft btn-sm" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} style={{ fontSize: 15, padding: '0 20px' }}>
                {expanded ? 'Show less' : 'Read the full recommendation'}
              </button>
            )}
            <a className="btn btn-sm" href={rec.source_url || contact.linkedin} style={{ border: '2px solid var(--b1)', color: 'var(--b2)', fontSize: 15, padding: '0 20px' }}>
              More on LinkedIn
            </a>
          </div>
        </div>
        {items.length > 1 && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => go(-1)}>
              Previous
            </button>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => go(1)}>
              Next
            </button>
          </div>
        )}
      </figure>
    </div>
  )
}

function OtherSelf() {
  const o = aboutPage.otherSelf
  return (
    <div className="sv" style={{ borderRadius: 32, background: 'linear-gradient(160deg, #160f3a, #4b2a8a)', color: '#fff', padding: 32, display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', overflow: 'clip' }}>
      <Spark className="twinkle" style={tw({ position: 'absolute', right: 24, top: 24, width: 26, height: 26, color: '#8fd8ff' }, '.4s')} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="float-y" src="/images/demi-wolf.jpg" alt={o.imageAlt} width={256} height={256} loading="lazy" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid #f9a8d4' }} />
      <h2 className="script" style={{ fontSize: 40, color: '#f9a8d4', lineHeight: 1.1 }}>{o.title}</h2>
      <p style={{ lineHeight: 1.65, color: '#ede4ff' }}>{o.body}</p>
      <Link href={o.href} style={{ fontWeight: 600, color: '#fff', marginTop: 'auto' }}>
        {o.link}
      </Link>
    </div>
  )
}

export default function AboutClient({
  about,
  openToWork,
  recommendations,
  learning,
  skills,
  posts,
  certifications,
}: {
  about: AboutContent
  openToWork: boolean
  recommendations: Recommendation[] | null
  learning: LearningItem[] | null
  skills: Skill[] | null
  posts: BlogPost[] | null
  certifications: Certification[] | null
}) {
  const intro = (about.intro ?? []).filter(Boolean)
  const email = about.contact?.email || contact.email
  const github = about.contact?.github_url || contact.github
  const linkedin = about.contact?.linkedin_url || contact.linkedin
  const recs = (recommendations ?? []).filter((r) => r && r.quote && r.name)

  return (
    <div className="ab">
      <div className="under-header" style={{ background: 'linear-gradient(160deg, #f8f4ff 0%, #fff8f0 55%, #efe4ff 100%)' }}>
        <section className="wrap ab-intro" style={{ paddingTop: 80, paddingBottom: 130 }}>
          <div style={{ position: 'relative', justifySelf: 'center', width: 'min(400px, 82vw)' }}>
            <div className="polaroid" style={{ background: '#fff', padding: '14px 14px 20px', borderRadius: 30, boxShadow: '0 40px 80px -36px var(--b2)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/demi-portrait.jpg" alt={aboutPage.portraitAlt} width={803} height={1000} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 20 }} />
              <p className="script" style={{ textAlign: 'center', fontSize: 32, marginTop: 10, color: 'var(--c2)' }}>{aboutPage.caption}</p>
            </div>
            <Spark className="twinkle" style={tw({ position: 'absolute', right: -18, top: -16, width: 44, height: 44, color: 'var(--c1)' }, '.2s')} />
            <Spark className="twinkle" style={tw({ position: 'absolute', left: -22, bottom: 90, width: 28, height: 28, color: '#b388ff' }, '1.2s')} />
            <Spark className="twinkle" style={tw({ position: 'absolute', right: -8, bottom: 30, width: 20, height: 20, color: 'var(--c1)' }, '2s')} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
            <h1 className="serif in" style={{ fontSize: 'clamp(48px, 5.6vw, 84px)', lineHeight: 1.05 }}>
              About <ScriptWord>me</ScriptWord>
            </h1>
            {intro.map((paragraph, i) => (
              <div
                key={i}
                className="in about-intro"
                style={{ ...delay(150 + i * 100), fontSize: i === 0 ? 'var(--t-lead)' : undefined, lineHeight: i === 0 ? 1.65 : 1.7, maxWidth: i === 0 ? '48ch' : '52ch' }}
              >
                <Markdown variant="case">{paragraph}</Markdown>
              </div>
            ))}
            <div className="in" style={{ ...delay(350), display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Button href="/experience">My experience</Button>
              <Button href="/projects" variant="line">
                My projects
              </Button>
            </div>
          </div>
        </section>
      </div>

      <LookingFor about={about} openToWork={openToWork} />

      <section style={{ padding: '140px 0' }}>
        <div className="wrap ab-code-grid">
          <CodeCard />
          <div className="sv" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <h2 className="serif" style={H2}>
              What I <ScriptWord>work with</ScriptWord>
            </h2>
            <div className="ab-skills">
              {aboutPage.workWith.map((w) => (
                <div key={w.title} className="skill" style={{ background: '#fff', borderRadius: 20, padding: 22 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--b2)' }}>{w.title}</h3>
                  <p style={{ fontSize: 'var(--t-meta)', marginTop: 6, lineHeight: 1.55 }}>{w.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="ai" style={{ background: 'linear-gradient(160deg, #f5efff 0%, #fdf2fb 100%)', padding: '130px 0' }}>
        <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
          <div className="sv" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 40, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 640 }}>
              <h2 className="serif" style={H2}>
                How I work with <ScriptWord>AI</ScriptWord>
              </h2>
              <p style={{ fontSize: 'var(--t-lead)', lineHeight: 1.65 }}>{aboutPage.ai.lead}</p>
            </div>
            <blockquote style={{ margin: 0, maxWidth: 420, padding: '26px 28px', borderRadius: 26, background: '#fff', position: 'relative' }}>
              <Spark style={{ position: 'absolute', right: 22, top: -14, width: 30, height: 30, color: 'var(--c1)' }} />
              <p className="serif" style={{ fontSize: 22, lineHeight: 1.4, color: '#4c1d95' }}>{aboutPage.ai.quote}</p>
            </blockquote>
          </div>
          <div className="sv" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h3 style={{ fontSize: 20, fontWeight: 600 }}>{aboutPage.ai.flowTitle}</h3>
            <ol className="ai-flow">
              {aboutPage.ai.flow.map((step) => (
                <li key={step.title} className="ai-step">
                  <span className={`ai-who ai-${step.tone}`}>{step.who}</span>
                  <strong>{step.title}</strong>
                  <span>{step.body}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="sv" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h3 style={{ fontSize: 20, fontWeight: 600 }}>{aboutPage.ai.toolkitTitle}</h3>
            <div className="ai-tools">
              {aboutPage.ai.toolkit.map((tool) => (
                <div key={tool.name} className="ai-tool">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <p className="serif" style={{ fontSize: 30 }}>{tool.name}</p>
                    <span
                      style={{
                        padding: '5px 12px',
                        borderRadius: 99,
                        fontSize: 'var(--t-sm)',
                        fontWeight: 600,
                        ...(tool.badgeStyle === 'fill'
                          ? { background: 'linear-gradient(45deg, var(--b1), var(--b2))', color: '#fff' }
                          : tool.badgeStyle === 'soft'
                            ? { background: '#f1e8ff', color: '#4c1d95' }
                            : { background: '#fdf2fb', color: '#9d174d' }),
                      }}
                    >
                      {tool.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: 'var(--t-meta)', lineHeight: 1.65 }}>{tool.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="sv" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', padding: '28px 32px', borderRadius: 28, background: '#2e1065', color: '#fff' }}>
            <Spark size={32} style={{ color: '#f9a8d4', flex: 'none' }} />
            <p style={{ flex: 1, minWidth: 'min(260px, 100%)', lineHeight: 1.65 }}>{aboutPage.ai.mcp}</p>
            <Button href="/experience" variant="light" style={{ color: '#4c1d95' }}>
              See my experience
            </Button>
          </div>
        </div>
      </section>

      <section id="people" style={{ padding: '140px 0 0' }}>
        <div className="wrap ab-split">
          <div className="sv" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h2 className="serif" style={H2}>
              How I work with <ScriptWord>people</ScriptWord>
            </h2>
            <p style={{ fontSize: 'var(--t-lead)', lineHeight: 1.65 }}>{aboutPage.people.lead}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {aboutPage.people.rows.map((row) => (
              <div key={row.title} className="sv people-row">
                <p className="serif people-num">{row.value}</p>
                <div>
                  <p style={{ fontWeight: 600 }}>{row.title}</p>
                  <p style={{ fontSize: 'var(--t-meta)', lineHeight: 1.6, marginTop: 4 }}>{row.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(learning || (posts && posts.length > 0)) && (
        <section id="learning" style={{ padding: '140px 0 0' }}>
          <div className="wrap ab-two">
            {learning && <CurrentlyLearning learning={learning} skills={skills ?? []} />}
            {posts && posts.length > 0 && <LatestWriting posts={posts} />}
          </div>
        </section>
      )}

      {certifications && certifications.length > 0 && <Certifications items={certifications} />}

      <section id="kind-words" style={{ padding: '140px 0 0' }}>
        <div className={recs.length > 0 ? 'wrap ab-quotes' : 'wrap'} style={recs.length > 0 ? undefined : { maxWidth: 520 }}>
          {recs.length > 0 && <KindWords items={recs} />}
          <OtherSelf />
        </div>
      </section>

      <section className="wrap" style={{ paddingBottom: 120, paddingTop: 120 }}>
        <div className="sv" style={{ position: 'relative', overflow: 'clip', borderRadius: 36, background: 'linear-gradient(135deg, var(--c1) 0%, var(--b1) 50%, var(--b2) 100%)', color: '#fff', padding: 'clamp(40px, 6vw, 80px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 32, alignItems: 'center' }}>
          <Spark className="twinkle" style={tw({ position: 'absolute', right: '6%', top: '14%', width: 30, height: 30, color: '#fff' }, '.6s')} />
          <div>
            <h2 className="script" style={{ fontSize: 'clamp(48px, 5.6vw, 80px)', lineHeight: 1.05 }}>{aboutPage.offKeyboard.title}</h2>
            <p style={{ marginTop: 14, fontSize: 'var(--t-lead)', lineHeight: 1.6, maxWidth: '40ch' }}>{aboutPage.offKeyboard.body}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
            <p style={{ fontSize: 'var(--t-lead)', fontWeight: 500 }}>{aboutPage.offKeyboard.prompt}</p>
            <a className="btn" href={`mailto:${email}`} style={{ background: '#fff', color: 'var(--b2)' }}>
              {email}
            </a>
            <div style={{ display: 'flex', gap: 22, fontWeight: 500 }}>
              <a href={github}>GitHub</a>
              <a href={linkedin}>LinkedIn</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
