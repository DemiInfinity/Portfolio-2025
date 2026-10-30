import type { Metadata } from 'next'
import RouteError from '@/components/RouteError'
import { loadOrUnavailable } from '@/lib/load'
import { ROUTE_ERRORS } from '@/lib/routeErrors'
import { fetchCv } from '@/lib/api'
import type { CvData } from '@/lib/api'
import { formatRange } from '@/lib/format'
import { degreeTitle, yearOf } from '@/lib/selectors'
import { aboutSeed } from '@/lib/content/site'
import './cv.css'

export const metadata: Metadata = {
  title: 'CV',
  // D-5: reachable by link and from Download CV, never indexed.
  robots: { index: false, follow: false },
}

// One server call; any failure goes to error.tsx (a CV with a silently
// missing section is worse than an error).
export const dynamic = 'force-dynamic'

function host(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

function githubUser(url: string): string {
  try {
    return new URL(url).pathname.split('/').filter(Boolean)[0] || url
  } catch {
    return url
  }
}

function list<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

export function CvSheets({ cv }: { cv: CvData }) {
  const profile = cv.profile ?? {}
  const contact = { ...aboutSeed.contact, ...(profile.contact ?? {}) }
  const headline = profile.cv_headline?.trim() || aboutSeed.cv_headline
  const portfolioHost = contact.portfolio_url ? host(contact.portfolio_url) : ''
  const contactItems = [
    contact.linkedin_url && { label: 'LinkedIn', text: 'Contact me on LinkedIn', href: contact.linkedin_url },
    contact.email && { label: 'Email', text: contact.email, href: `mailto:${contact.email}` },
    contact.portfolio_url && { label: 'Portfolio', text: portfolioHost, href: contact.portfolio_url },
    contact.github_url && { label: 'GitHub', text: githubUser(contact.github_url), href: contact.github_url },
    contact.location && { label: 'Location', text: contact.location },
  ].filter(Boolean) as { label: string; text: string; href?: string }[]

  const learning = list(cv.learning).filter((l) => !l.status || l.status === 'in_progress')
  const certifications = list(cv.certifications)
  const rec = cv.recommendation
  const recBy = rec ? [rec.name, [rec.role, rec.company].filter(Boolean).join(' at ')].filter(Boolean).join(', ') : ''

  return (
    <div className="cv-page">
      <article className="cv cv-sheet-1" aria-label="CV page 1">
        <div className="cv-bar" aria-hidden="true" />
        <div className="cv-body">
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
            <div>
              <h1>Demi Taylor Nimmo</h1>
              <p style={{ fontSize: 15, fontWeight: 500, marginTop: 6, color: '#5b21b6' }}>{headline}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" width={128} height={72} style={{ height: 34, width: 'auto', marginTop: 6 }} />
          </header>

          {contactItems.length > 0 && (
            <ul className="cv-contact" style={{ paddingLeft: 16 }}>
              {contactItems.map((item) => (
                <li key={item.label} style={{ fontSize: 12.5 }}>
                  <strong>{item.label}:</strong> {item.href ? <a href={item.href}>{item.text}</a> : item.text}
                </li>
              ))}
            </ul>
          )}

          {profile.cv_profile?.trim() && (
            <section style={{ gap: 8 }}>
              <h2>Profile</h2>
              <p className="profile">{profile.cv_profile}</p>
            </section>
          )}

          <section style={{ gap: 14 }}>
            <h2>Experience</h2>
            {list(cv.experience).map((role) => (
              <div key={role.id ?? `${role.company}-${role.start_date}`} className="role">
                <div className="role-top">
                  <h3>
                    {role.position} · {role.company}
                  </h3>
                  <span className="when">{formatRange(role.start_date, role.end_date, 'cv')}</span>
                </div>
                {role.location && <p className="where">{role.location}</p>}
                {list(role.achievements).length > 0 && (
                  <ul>
                    {list(role.achievements).map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        </div>
        <footer className="cv-foot">
          <span>Phone available on request</span>
          <span>Page 1 of 2</span>
        </footer>
      </article>

      <article className="cv cv-sheet-2" aria-label="CV page 2">
        <div className="cv-bar" aria-hidden="true" />
        <div className="cv-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12.5, color: '#5a5068' }}>
            <span className="serif" style={{ fontSize: 17, color: '#2e1065' }}>Demi Taylor Nimmo</span>
            <span>{[headline, portfolioHost].filter(Boolean).join(' · ')}</span>
          </div>

          {list(cv.skills).length > 0 && (
            <section>
              <h2>Skills</h2>
              <dl className="sk">
                {list(cv.skills).map((group) => (
                  <div key={group.category} style={{ display: 'contents' }}>
                    <dt>{group.category}</dt>
                    <dd>{list(group.items).map((s) => s.name).join(', ')}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {profile.cv_ai_workflow?.trim() && (
            <section>
              <h2>AI-assisted workflow</h2>
              <p className="body">{profile.cv_ai_workflow}</p>
            </section>
          )}

          {list(cv.projects).length > 0 && (
            <section style={{ gap: 12 }}>
              <h2>Selected projects</h2>
              {list(cv.projects)
                .slice(0, 3)
                .map((p) => (
                  <div key={p.id ?? p.slug} className="proj">
                    <div className="proj-top">
                      <h3>{p.title}</h3>
                      {list(p.technologies).length > 0 && <span className="stack">{list(p.technologies).join(' · ')}</span>}
                    </div>
                    {p.description && <p className="body">{p.description}</p>}
                  </div>
                ))}
            </section>
          )}

          {list(cv.education).length > 0 && (
            <section>
              <h2>Education</h2>
              {list(cv.education).map((e) => {
                const years = [yearOf(e.start_date), yearOf(e.end_date)].filter(Boolean).join(' – ')
                return (
                  <div key={e.id ?? e.institution} className="proj">
                    <div className="proj-top">
                      <h3>{[degreeTitle(e), e.institution].filter(Boolean).join(' · ')}</h3>
                      {years && <span className="stack" style={{ color: '#5b21b6', fontWeight: 500 }}>{years}</span>}
                    </div>
                    {e.description && <p className="body">{e.description}</p>}
                  </div>
                )
              })}
            </section>
          )}

          {certifications.length > 0 && (
            <section>
              <h2>Certifications</h2>
              <ul>
                {certifications.map((c) => (
                  <li key={c.id ?? c.name}>{[c.name, c.issuer, yearOf(c.issue_date)].filter(Boolean).join(', ')}</li>
                ))}
              </ul>
            </section>
          )}

          {learning.length > 0 && (
            <section>
              <h2>Currently learning</h2>
              <ul>
                {learning.map((l) => (
                  <li key={l.id ?? l.title}>{l.provider ? `${l.title} (${l.provider})` : l.title}</li>
                ))}
              </ul>
            </section>
          )}

          {rec && rec.quote && (
            <section>
              <h2>Recommendation</h2>
              <blockquote>
                <p className="body" style={{ fontStyle: 'italic' }}>“{rec.quote}”</p>
                {recBy && <p style={{ fontSize: 12.5, marginTop: 6 }}>{recBy}</p>}
              </blockquote>
            </section>
          )}
        </div>
        <footer className="cv-foot">
          <span>
            Contact me on {contact.linkedin_url ? <a href={contact.linkedin_url}>LinkedIn</a> : 'LinkedIn'} · phone available on request
          </span>
          <span>Page 2 of 2</span>
        </footer>
      </article>
    </div>
  )
}

export default async function CvPage() {
  const loaded = await loadOrUnavailable(fetchCv)
  if (!loaded.ok) return <RouteError {...ROUTE_ERRORS.cv} reference={loaded.reference} />
  const cv = loaded.data
  return <CvSheets cv={cv} />
}
