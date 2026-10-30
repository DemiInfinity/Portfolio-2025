import { getAbout, AboutContent } from './siteContent'
import { listRecommendations, Recommendation } from './recommendations'
import { selectRows, Row } from '../utils/db'
import { formatJob } from '../routes/workHistory'
import { formatEducation } from '../routes/education'
import { formatLearning, COLUMNS as LEARNING_COLUMNS, LEGACY_COLUMNS as LEARNING_LEGACY } from '../routes/learning'
import { isPublicProject } from '../routes/projects'
import { toStringArray } from '../utils/lists'

/**
 * The CV aggregate (H-12, extended by H-16/H-17/H-19): one read for the /cv
 * page and the PDF generator. Any table error rejects (no partial CVs).
 */

export interface CvData {
  updated_at: string | null
  profile: Pick<AboutContent, 'cv_headline' | 'cv_profile' | 'cv_ai_workflow' | 'contact'>
  recommendation: Recommendation | null
  experience: Row[]
  skills: { category: string; items: { id: number; name: string; level: string }[] }[]
  projects: Row[]
  education: Row[]
  learning: Row[]
  certifications: Row[]
  counts: { experience: number; projects: number; skills: number; education: number; learning: number; certifications: number }
}

const WORK_COLS = 'id, company, position, location, start_date, end_date, description, achievements, technologies, company_url, highlights, created_at, updated_at'
const WORK_LEGACY = ['id, company, position, location, start_date, end_date, description, achievements, technologies, company_url, created_at, updated_at', 'id, company, position, location, start_date, end_date, description, achievements, technologies, company_url']
const SKILL_COLS = 'id, name, category, level, created_at, updated_at'
const SKILL_LEGACY = 'id, name, category, level'
const PROJECT_BASE = 'id, title, slug, description, technologies, status, featured, live_url, date, created_at, updated_at'
const PROJECT_COLS = `${PROJECT_BASE}, role, platform, show_on_site`
const PROJECT_LEGACY = [`${PROJECT_BASE}, role, platform`, PROJECT_BASE]
const EDU_COLS = 'id, institution, degree, field_of_study, location, start_date, end_date, gpa, description, achievements, created_at, updated_at'
const EDU_LEGACY = 'id, institution, degree, field_of_study, location, start_date, end_date, gpa, description, achievements'
const CERT_COLS = 'id, name, issuer, issue_date, expiry_date, credential_id, credential_url, created_at, updated_at'
const CERT_LEGACY = 'id, name, issuer, issue_date, expiry_date, credential_id, credential_url'

const time = (v: unknown) => {
  const t = Date.parse(String(v ?? ''))
  return Number.isFinite(t) ? t : 0
}

function latest(rows: Row[]): number {
  return rows.reduce((m, r) => Math.max(m, time(r.updated_at), time(r.created_at)), 0)
}

export async function buildCvData(now: Date = new Date()): Promise<CvData> {
  const [about, recommendations, work, skills, projects, education, learning, certs] = await Promise.all([
    getAbout(),
    listRecommendations(),
    selectRows('work_history', WORK_COLS, WORK_LEGACY),
    selectRows('skills', SKILL_COLS, SKILL_LEGACY, (q) => q.order('category', { ascending: true }).order('name', { ascending: true })),
    selectRows('projects', PROJECT_COLS, PROJECT_LEGACY),
    selectRows('education', EDU_COLS, EDU_LEGACY, (q) => q.order('start_date', { ascending: false })),
    selectRows('learning', LEARNING_COLUMNS, LEARNING_LEGACY),
    selectRows('certifications', CERT_COLS, CERT_LEGACY, (q) => q.order('issue_date', { ascending: false }))
  ])

  const experience = work
    .map((j): Row => ({ ...formatJob(j), current: !j.end_date }))
    .sort((a, b) => (a.current === b.current ? time(b.start_date) - time(a.start_date) : a.current ? -1 : 1))
    .map(({ created_at: _c, updated_at: _u, ...rest }) => rest)

  const groups: CvData['skills'] = []
  for (const s of skills) {
    const category = String(s.category || 'Other')
    let g = groups.find((x) => x.category === category)
    if (!g) groups.push((g = { category, items: [] }))
    g.items.push({ id: s.id, name: s.name, level: s.level })
  }
  for (const g of groups) g.items.sort((a, b) => String(a.name).localeCompare(String(b.name)))

  const publicProjects = projects
    .filter(isPublicProject)
    .sort((a, b) => {
      if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1
      return time(b.date || b.created_at) - time(a.date || a.created_at)
    })
  const projectItems = publicProjects.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description ?? '',
    technologies: toStringArray(p.technologies),
    status: p.status,
    featured: Boolean(p.featured),
    live_url: p.live_url || null,
    role: p.role ?? null,
    platform: p.platform ?? null
  }))

  const educationItems = education.map((e) => {
    const f = formatEducation(e)
    return {
      id: f.id, institution: f.institution, degree: f.degree, field_of_study: f.field_of_study ?? null,
      location: f.location ?? null, start_date: f.start_date, end_date: f.end_date ?? null,
      grade: f.grade ?? null, description: f.description ?? null, achievements: f.achievements
    }
  })

  const activeLearning = learning.filter((l) => l.status === 'in_progress' || l.status === 'not_started')
  const learningItems = activeLearning.map((l) => {
    const f = formatLearning(l)
    return {
      id: f.id, title: f.title, provider: f.provider ?? null, description: f.description ?? null,
      progress: f.progress, status: f.status, start_date: f.start_date, estimated_completion: f.estimated_completion ?? null
    }
  })

  const today = now.toISOString().slice(0, 10)
  const expired = (c: Row) => Boolean(c.expiry_date) && String(c.expiry_date).slice(0, 10) < today
  const certItems = [...certs]
    .sort((a, b) => (expired(a) === expired(b) ? time(b.issue_date) - time(a.issue_date) : expired(a) ? 1 : -1))
    .map((c) => ({
      id: c.id, name: c.name, issuer: c.issuer, issue_date: c.issue_date, expiry_date: c.expiry_date ?? null,
      credential_id: c.credential_id ?? null, credential_url: c.credential_url ?? null
    }))

  const recommendation = recommendations.find((r) => r.show_on_cv) || null

  const newest = Math.max(
    time(about.updated_at),
    latest(recommendations as unknown as Row[]),
    latest(work),
    latest(skills),
    latest(publicProjects),
    latest(education),
    latest(activeLearning),
    latest(certs)
  )

  return {
    updated_at: newest > 0 ? new Date(newest).toISOString() : null,
    profile: {
      cv_headline: about.value.cv_headline,
      cv_profile: about.value.cv_profile,
      cv_ai_workflow: about.value.cv_ai_workflow,
      contact: about.value.contact
    },
    recommendation,
    experience,
    skills: groups,
    projects: projectItems,
    education: educationItems,
    learning: learningItems,
    certifications: certItems,
    counts: {
      experience: experience.length,
      projects: projectItems.length,
      skills: skills.length,
      education: educationItems.length,
      learning: learningItems.length,
      certifications: certItems.length
    }
  }
}
