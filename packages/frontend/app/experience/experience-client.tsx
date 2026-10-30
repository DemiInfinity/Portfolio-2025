'use client'

import type { CSSProperties } from 'react'
import Button from '@/components/ui/Button'
import { Chip, Stat } from '@/components/ui/Chip'
import Spark from '@/components/ui/Spark'
import { useOverlay } from '@/components/overlays/OverlayProvider'
import type { Education, WorkRole } from '@/lib/api'
import { formatRange } from '@/lib/format'
import { degreeTitle, yearOf } from '@/lib/selectors'
import { contact, experienceHero } from '@/lib/content/site'

const delay = (ms: number) => ({ ['--d' as string]: `${ms}ms` }) as CSSProperties

function Role({ role, index, last }: { role: WorkRole; index: number; last: boolean }) {
  const current = !role.end_date
  const achievements = role.achievements ?? []
  const highlights = role.highlights ?? []
  const technologies = role.technologies ?? []
  const big = index === 0
  return (
    <li className="exp-role">
      <div className="exp-when">
        <strong style={{ display: 'block' }}>{formatRange(role.start_date, role.end_date, 'site')}</strong>
        {role.location && <span>{role.location}</span>}
      </div>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        {!last && (
          <span className="exp-grow" aria-hidden="true" style={{ position: 'absolute', top: 34, bottom: 0, width: 3, borderRadius: 3, background: 'linear-gradient(var(--c1), #e8c6f7)' }} />
        )}
        <Spark className="exp-pop" style={{ width: big ? 28 : 22, height: big ? 28 : 22, marginTop: big ? 6 : 8, color: index % 2 === 0 ? 'var(--c1)' : '#b388ff' }} />
      </div>
      <div className="sv" style={{ paddingBottom: last ? 40 : 72, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start', minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 className="serif" style={{ fontSize: 'var(--t-h3)' }}>{role.position}</h3>
          {current && (
            <span style={{ padding: '4px 12px', borderRadius: 99, background: 'linear-gradient(45deg, var(--b1), var(--b2))', color: '#fff', fontSize: 'var(--t-sm)', fontWeight: 600 }}>
              Current
            </span>
          )}
        </div>
        <p style={{ fontSize: 'var(--t-meta)', fontWeight: 600, color: 'var(--b2)' }}>
          {role.company_url ? (
            <a href={role.company_url} target="_blank" rel="noopener noreferrer">
              {role.company}
            </a>
          ) : (
            role.company
          )}
        </p>
        {role.description && <p style={{ lineHeight: 1.65, maxWidth: '60ch' }}>{role.description}</p>}
        {achievements.length > 0 && (
          <ul style={{ paddingLeft: 20, lineHeight: 1.7, fontSize: 'var(--t-meta)' }}>
            {achievements.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
        {highlights.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {highlights.map((h) => (
              <Stat key={h}>{h}</Stat>
            ))}
          </div>
        )}
        {technologies.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {technologies.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}

export default function ExperienceClient({ roles, education }: { roles: WorkRole[]; education: Education[] }) {
  const { openContact } = useOverlay()
  const edu = education[0]
  const years = edu ? [yearOf(edu.start_date), yearOf(edu.end_date)].filter(Boolean).join(' – ') : ''

  return (
    <>
      <div className="under-header" style={{ background: 'linear-gradient(160deg, #f8f4ff 0%, #fff8f0 60%, #efe4ff 100%)', ['--t-h3' as string]: 'clamp(26px, 2.4vw, 34px)' } as CSSProperties}>
        <section className="wrap wrap-narrow" style={{ paddingTop: 100, paddingBottom: 100, position: 'relative' }}>
          <Spark className="twinkle" style={{ ['--d' as string]: '.5s', position: 'absolute', right: '8%', top: 80, width: 30, height: 30, color: 'var(--c1)' } as CSSProperties} />
          <h1 className="serif in" style={{ fontSize: 'clamp(52px, 6.4vw, 96px)', lineHeight: 1.05 }}>
            My{' '}
            <span className="script grad-text" style={{ fontSize: '1.15em', color: 'var(--c2)', paddingRight: '.1em' }}>
              experience
            </span>
          </h1>
          <p className="in" style={{ ...delay(200), marginTop: 20, fontSize: 'var(--t-lead)', lineHeight: 1.6, maxWidth: '48ch' }}>{experienceHero.lead}</p>
          <div className="in" style={{ ...delay(350), display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
            {experienceHero.stats.map((s) => (
              <Stat key={s}>{s}</Stat>
            ))}
          </div>
        </section>
      </div>

      <div style={{ ['--t-h3' as string]: 'clamp(26px, 2.4vw, 34px)' } as CSSProperties}>
        <section className="wrap wrap-narrow" style={{ paddingTop: 100, paddingBottom: 60 }}>
          <h2 className="serif sv" style={{ fontSize: 'var(--t-h3)', marginBottom: 56 }}>Where I’ve worked</h2>
          {roles.length === 0 ? (
            <p style={{ fontSize: 'var(--t-lead)' }}>Work history is on its way.</p>
          ) : (
            <ol style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column' }}>
              {roles.map((role, i) => (
                <Role key={role.id ?? `${role.company}-${role.start_date}`} role={role} index={i} last={i === roles.length - 1} />
              ))}
            </ol>
          )}
        </section>

        <section className="wrap wrap-narrow" style={{ paddingTop: 60, paddingBottom: 120 }}>
          <div className="sv" style={{ borderRadius: 32, background: 'linear-gradient(135deg, #fdf2fb, #f3e8ff)', padding: 'clamp(28px, 5vw, 56px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 32, alignItems: 'center' }}>
            <div>
              <h2 className="serif" style={{ fontSize: 'var(--t-h3)' }}>Education</h2>
              {edu ? (
                <>
                  <p style={{ marginTop: 12, fontWeight: 600 }}>{degreeTitle(edu)}</p>
                  <p style={{ fontSize: 'var(--t-meta)', color: 'var(--b2)', fontWeight: 600 }}>
                    {[edu.institution, years].filter(Boolean).join(', ')}
                  </p>
                  {edu.description && <p style={{ marginTop: 12, lineHeight: 1.65, fontSize: 'var(--t-meta)' }}>{edu.description}</p>}
                  {edu.grade && <p style={{ marginTop: 8, fontSize: 'var(--t-meta)', fontWeight: 600 }}>Grade: {edu.grade}</p>}
                </>
              ) : null}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
              <p className="script" style={{ fontSize: 44, color: 'var(--c2)', lineHeight: 1.1 }}>Want the full story?</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Button onClick={openContact}>Get in touch</Button>
                <Button href={contact.linkedin} variant="line">
                  LinkedIn
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
