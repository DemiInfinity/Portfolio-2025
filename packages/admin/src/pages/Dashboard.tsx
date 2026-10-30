import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { computeAttention, finding } from '@/lib/attention'
import { isBuilding, rebuiltLabel, useCvStatus, useRegenerateCv } from '@/lib/cv'
import { fmtDay, plural } from '@/lib/format'
import { useFlags } from '@/lib/flags'
import { useUnreadCount } from '@/lib/messages'
import { SITE_URL } from '@/lib/config'
import { PROJECTS_KEY, fetchProjects } from '@/lib/projects'
import { BLOG_KEY, fetchPosts, publishedNewestFirst } from './Blog'
import { WORK_KEY, fetchRoles } from './WorkHistory'
import { EDUCATION_KEY, fetchEducation } from './Education'
import { CERTS_KEY, fetchCerts } from './Certifications'
import { LEARNING_KEY, SKILLS_KEY, fetchCourses, fetchSkills } from './Learning'
import { useFlagToggle } from '@/components/useFlagToggle'
import Switch from '@/components/ui/Switch'
import Icon from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'

const SWITCHES: [string, string, string][] = [
  ['maintenance_mode', 'Maintenance mode', 'Shows every visitor the maintenance page.'],
  ['open_to_work', 'Open to work badge', 'The badge beside your name on the home page.'],
  ['show_marbl', 'List Marbl', 'Marbl on the Privacy and Terms pages.'],
]

export default function Dashboard() {
  const { say } = useToast()
  const projects = useQuery({ queryKey: PROJECTS_KEY, queryFn: fetchProjects })
  const posts = useQuery({ queryKey: BLOG_KEY, queryFn: fetchPosts })
  const roles = useQuery({ queryKey: WORK_KEY, queryFn: fetchRoles })
  const education = useQuery({ queryKey: EDUCATION_KEY, queryFn: fetchEducation })
  const certs = useQuery({ queryKey: CERTS_KEY, queryFn: fetchCerts })
  const learning = useQuery({ queryKey: LEARNING_KEY, queryFn: fetchCourses })
  const skills = useQuery({ queryKey: SKILLS_KEY, queryFn: fetchSkills })
  const flags = useFlags()
  const cv = useCvStatus()
  const unread = useUnreadCount()
  const regen = useRegenerateCv(say)
  const { toggle, confirm } = useFlagToggle()

  const today = new Date()
  const P = projects.data || []
  const B = posts.data || []
  const R = roles.data || []
  const C = learning.data?.items || []
  const certCount = certs.data?.length ?? 0
  const published = publishedNewestFirst(B)
  const latest = published[0]
  const current = R.find((r) => !r.end_date)
  const avg = C.length ? Math.round(C.reduce((a, c) => a + c.progress, 0) / C.length) : 0

  const ready = !!(posts.data && learning.data && certs.data)
  const input = { courses: C, cv: cv.data, certCount, latestPost: latest, unread: unread.data ?? 0 }
  const todo = ready ? computeAttention(input, today) : []
  const v = (loaded: unknown, value: string) => (loaded ? value : '–')

  const kpis = [
    { label: 'Projects', value: v(projects.data, String(P.length)), caption: `${P.filter((p) => p.featured).length} featured on the home page`, href: '/projects' },
    { label: 'Blog posts', value: v(posts.data, String(B.length)), caption: `${published.length} published${latest ? ', latest ' + fmtDay(latest.publish_date) : ''}`, href: '/blog' },
    { label: 'Roles', value: v(roles.data, String(R.length)), caption: current ? `Current: ${current.company}` : 'No current role', href: '/work-history' },
    { label: 'Courses', value: v(learning.data, String(C.length)), caption: `${avg}% average progress`, href: '/learning' },
    { label: 'Certifications', value: v(certs.data, String(certCount)), caption: certCount ? `${certCount} listed` : 'None listed yet', href: '/certifications' },
  ]

  const s = cv.data
  const building = regen.isPending || isBuilding(s)
  const pdfRow = !s && !regen.isPending
    ? { node: <span className="mute">Unknown</span> }
    : building
      ? { node: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} className="mute"><span className="spin" aria-hidden="true" style={{ borderColor: '#d9cfe6', borderTopColor: '#615a6c', width: 12, height: 12 }} />Rebuilding</span> }
      : s?.state === 'failed'
        ? { node: <span style={{ color: '#b4235a' }}>Build failed</span> }
        : s?.generatedAt
          ? { node: <span style={{ color: '#247b50' }}>Rebuilt {rebuiltLabel(s.generatedAt, today).replace(/^today, /, '')}</span> }
          : { node: <span style={{ color: '#92400e' }}>Not built yet</span> }

  const cvRows: [string, string, string][] = [
    ['Experience', plural(R.length, 'role', 'roles'), '#241b33'],
    ['Projects', plural(P.length, 'project', 'projects'), '#241b33'],
    ['Skills', plural(skills.data?.length ?? 0, 'skill', 'skills'), '#241b33'],
    ['Education', plural(education.data?.length ?? 0, 'entry', 'entries'), '#241b33'],
    ['Learning', plural(C.length, 'course', 'courses'), '#241b33'],
    ['Certifications', certCount ? String(certCount) : 'Left out', certCount ? '#241b33' : '#615a6c'],
  ]

  const flagRows = SWITCHES.map(([key, label, desc]) => ({ flag: flags.data?.find((f) => f.name === key), label, desc })).filter((r) => r.flag)

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Dashboard</h1>
          <p className="ad-sub">{ready ? finding(input, today) : ' '}</p>
        </div>
        <Link className="btn btn-primary" to="/blog?new=1">
          <Icon name="plus" size={16} />
          Write a post
        </Link>
      </div>

      <div className="card kpis" style={{ ['--n' as string]: 5 }}>
        {kpis.map((k) => (
          <Link key={k.label} className="kpi" to={k.href}>
            <span className="kpi-l">{k.label}</span>
            <span className="kpi-v">{k.value}</span>
            <span className="kpi-c">{k.caption}</span>
          </Link>
        ))}
      </div>

      <div className="rail">
        <div className="stack">
          <section className="card" aria-labelledby="todo-h">
            <div className="card-head">
              <h2 id="todo-h" className="card-title">Needs attention <span className="mute num" style={{ fontWeight: 400 }}>{ready ? todo.length : ''}</span></h2>
            </div>
            <ul className="rows">
              {todo.map((t) => (
                <li key={t.title} className="row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto 140px' }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="r1" style={{ whiteSpace: 'normal' }}>{t.title}</p>
                    <p className="r2" style={{ whiteSpace: 'normal' }}>{t.detail}</p>
                  </div>
                  <span className={`pill p-${t.tone} hide-sm`}>{t.pill}</span>
                  <Link className="btn btn-line right" to={t.href} style={{ minWidth: 140 }}>{t.action}</Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card" aria-labelledby="posts-h">
            <div className="card-head">
              <h2 id="posts-h" className="card-title">Latest posts</h2>
              <Link className="btn btn-text" to="/blog" style={{ minHeight: 36 }}>View all {B.length}</Link>
            </div>
            <div className="lh" style={{ gridTemplateColumns: 'minmax(0, 1fr) 110px 120px' }}><span>Post</span><span>Status</span><span className="right">Published</span></div>
            <ul className="rows">
              {published.slice(0, 4).map((p) => (
                <li key={p.id} className="row" style={{ gridTemplateColumns: 'minmax(0, 1fr) 110px 120px' }}>
                  <div className="cell-id">
                    <img className="thumb" src={p.cover_image || '/logo.svg'} alt="" width={1400} height={933} loading="lazy" style={p.cover_image ? undefined : { objectFit: 'contain' }} />
                    <div><p className="r1">{p.title}</p><p className="r2">{p.category} · {p.read_time ?? 0} min read</p></div>
                  </div>
                  <span className="hide-sm"><span className="pill p-live"><span className="dot" />Published</span></span>
                  <span className="right num mute" style={{ fontSize: 13 }}>{fmtDay(p.publish_date)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="stack" style={{ gap: 16 }} aria-label="Site and CV">
          <section>
            <h2 className="rail-h">Site switches</h2>
            <div className="card card-pad" style={{ paddingTop: 8, paddingBottom: 8 }}>
              {flagRows.map((r, k) => (
                <div key={r.label} style={{ padding: '10px 0', borderTop: k ? '1px solid #f0eaf7' : 0 }}>
                  <Switch checked={!!r.flag!.enabled} onChange={() => toggle(r.flag!)}><span style={{ fontWeight: 500 }}>{r.label}</span></Switch>
                  <p className="mute" style={{ fontSize: 13, marginTop: -4 }}>{r.desc}</p>
                </div>
              ))}
              {flags.data && !flagRows.length ? <p className="mute" style={{ padding: '10px 0' }}>No site switches yet.</p> : null}
            </div>
          </section>
          <section>
            <h2 className="rail-h">Your CV</h2>
            <div className="card card-pad">
              <p className="mute" style={{ fontSize: 13 }}>Rebuilt from this content whenever it changes.</p>
              <dl className="kv num" style={{ marginTop: 10 }}>
                {cvRows.map(([label, value, ink]) => (
                  <Fragment key={label}>
                    <dt>{label}</dt>
                    <dd className="right" style={{ color: ink }}>{value}</dd>
                  </Fragment>
                ))}
                <dt>PDF for download</dt>
                <dd className="right" data-testid="cv-pdf">{pdfRow.node}</dd>
              </dl>
              <a className="btn btn-line" href={`${SITE_URL}/cv`} target="_blank" rel="noopener noreferrer" style={{ width: '100%', marginTop: 14 }}>Preview the CV</a>
              <button type="button" className="btn btn-text" onClick={() => regen.mutate()} disabled={building} style={{ width: '100%', marginTop: 4 }}>Regenerate CV</button>
            </div>
          </section>
        </aside>
      </div>

      {confirm}
    </>
  )
}
