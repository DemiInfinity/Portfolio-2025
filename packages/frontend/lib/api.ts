export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'https://api.demitaylornimmo.com/api'

/**
 * Thrown when the API could not be reached or returned an unexpected error.
 * The backend runs on Railway and cold-starts when idle, so this can simply
 * mean "the server is waking up" rather than "the data doesn't exist" -
 * callers should surface this distinctly from a genuinely empty result and
 * from a genuine 404, not silently swallow it into an empty list/null.
 */
export class ApiUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'ApiUnavailableError'
    if (options?.cause !== undefined) {
      // @ts-expect-error - `cause` typing varies across TS lib targets
      this.cause = options.cause
    }
  }
}

/**
 * Next.js throws special internal errors (tagged with a `digest`) to signal
 * control flow - e.g. DYNAMIC_SERVER_USAGE when a `no-store`/dynamic fetch
 * runs during a static-generation attempt, so it can fall back to rendering
 * that route dynamically instead of failing the build. redirect()/notFound()
 * use the same mechanism (NEXT_REDIRECT/NEXT_HTTP_ERROR_FALLBACK digests).
 * These must be rethrown unchanged - wrapping them in ApiUnavailableError
 * destroys the digest Next relies on and turns a graceful fallback into a
 * hard build failure.
 */
function isNextControlFlowError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest
  return (
    typeof digest === 'string' &&
    (digest === 'DYNAMIC_SERVER_USAGE' ||
      digest.startsWith('NEXT_REDIRECT') ||
      digest.startsWith('NEXT_HTTP_ERROR_FALLBACK'))
  )
}

async function fetchList<T>(url: string, description: string, init?: RequestInit): Promise<T[]> {
  let response: Response
  try {
    response = init ? await fetch(url, init) : await fetch(url)
  } catch (error) {
    if (isNextControlFlowError(error)) throw error
    console.error(`Error fetching ${description}:`, error)
    throw new ApiUnavailableError(
      `Unable to reach the API to load ${description}. It may be waking up from a cold start - please try again shortly.`,
      { cause: error }
    )
  }
  if (!response.ok) {
    console.error(`Error fetching ${description}: status ${response.status}`)
    throw new ApiUnavailableError(
      `The API returned an error while loading ${description} (status ${response.status}).`
    )
  }
  try {
    const data = await response.json()
    if (data.success === false) {
      throw new ApiUnavailableError(
        `The API reported a failure while loading ${description}: ${data.error ?? 'unknown error'}.`
      )
    }
    return (data.data ?? []) as T[]
  } catch (error) {
    if (error instanceof ApiUnavailableError || isNextControlFlowError(error)) throw error
    console.error(`Error parsing response for ${description}:`, error)
    throw new ApiUnavailableError(
      `The API returned an unexpected response while loading ${description}.`,
      { cause: error }
    )
  }
}

async function fetchSingle<T>(url: string, description: string, init?: RequestInit): Promise<T | null> {
  let response: Response
  try {
    response = init ? await fetch(url, init) : await fetch(url)
  } catch (error) {
    if (isNextControlFlowError(error)) throw error
    console.error(`Error fetching ${description}:`, error)
    throw new ApiUnavailableError(
      `Unable to reach the API to load ${description}. It may be waking up from a cold start - please try again shortly.`,
      { cause: error }
    )
  }
  if (response.status === 404) {
    // Genuinely doesn't exist - not a connectivity/availability problem.
    return null
  }
  if (!response.ok) {
    console.error(`Error fetching ${description}: status ${response.status}`)
    throw new ApiUnavailableError(
      `The API returned an error while loading ${description} (status ${response.status}).`
    )
  }
  try {
    const data = await response.json()
    if (data.success === false) {
      throw new ApiUnavailableError(
        `The API reported a failure while loading ${description}: ${data.error ?? 'unknown error'}.`
      )
    }
    return (data.data ?? null) as T | null
  } catch (error) {
    if (error instanceof ApiUnavailableError || isNextControlFlowError(error)) throw error
    console.error(`Error parsing response for ${description}:`, error)
    throw new ApiUnavailableError(
      `The API returned an unexpected response while loading ${description}.`,
      { cause: error }
    )
  }
}

// ---------- shared shapes (H-15 public contract; new fields are optional) ----------

export interface Project {
  id: number
  slug: string
  title: string
  description: string
  content?: string | null
  image?: string | null
  images?: string[] | null
  technologies?: string[] | null
  github_url?: string | null
  live_url?: string | null
  featured?: boolean
  date?: string | null
  status?: string | null
  inspiration?: string | null
  role?: string | null
  platform?: string | null
  /** H-18: single reads only. */
  case_study?: CaseStudy | null
  /** H-18: list rows only. */
  has_case_study?: boolean
  /** H-22: list rows only; `[]` when none. */
  feature_titles?: string[] | null
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

export interface CaseStudyImageItem {
  title?: string | null
  body?: string | null
  image?: string | null
  image_alt?: string | null
}

export interface CaseStudy {
  overview?: string | null
  problem?: string | null
  how_might_we?: string | null
  process?: (CaseStudyImageItem & { label?: string | null })[] | null
  architecture?: { summary?: string | null; steps?: { title?: string | null; detail?: string | null }[] | null } | null
  features?: CaseStudyImageItem[] | null
  challenges?: { title?: string | null; solution?: string | null }[] | null
  metrics?: { value?: string | null; label?: string | null }[] | null
  learned?: string | null
}

export interface AboutContent {
  intro: string[]
  looking_for: { summary: string; items: { label: string; value: string }[] }
  open_to_work_off_line: string
  cv_headline: string
  cv_profile: string
  cv_ai_workflow: string
  contact: { email: string; linkedin_url: string; github_url: string; portfolio_url: string; location: string }
  updated_at?: string | null
}

export interface Recommendation {
  id: number
  quote: string
  full_text?: string | null
  name: string
  role?: string | null
  company?: string | null
  relationship?: string | null
  source?: string | null
  source_url?: string | null
  date?: string | null
  show_on_cv?: boolean
  sort_order?: number
}

export interface BlogPost {
  id: number
  slug: string
  title: string
  excerpt?: string | null
  content?: string | null
  author?: string | null
  read_time?: number | null
  category?: string | null
  tags?: string[] | null
  featured?: boolean
  cover_image?: string | null
  publish_date?: string | null
  created_at?: string | null
  [key: string]: unknown
}

export interface WorkRole {
  id: number
  company: string
  position: string
  location?: string | null
  start_date: string
  end_date?: string | null
  description?: string | null
  achievements?: string[] | null
  technologies?: string[] | null
  highlights?: string[] | null
  company_url?: string | null
  current?: boolean
  [key: string]: unknown
}

export interface Education {
  id: number
  institution: string
  degree: string
  field_of_study?: string | null
  start_date?: string | null
  end_date?: string | null
  description?: string | null
  gpa?: string | null
  grade?: string | null
  [key: string]: unknown
}

export interface LearningItem {
  id: number
  title: string
  provider?: string | null
  description?: string | null
  progress?: number | null
  status?: string | null
  start_date?: string | null
  estimated_completion?: string | null
  category?: string | null
  [key: string]: unknown
}

export interface Skill {
  id: number
  name: string
  category?: string | null
  level?: string | null
  description?: string | null
  [key: string]: unknown
}

export interface Certification {
  id: number
  name: string
  issuer?: string | null
  issue_date?: string | null
  credential_url?: string | null
  [key: string]: unknown
}

export interface CvData {
  updated_at?: string
  experience: WorkRole[]
  skills: { category: string; items: Skill[] }[]
  projects: Project[]
  education: Education[]
  learning: LearningItem[]
  certifications: Certification[]
  counts?: Record<string, number>
  /** H-16 via H-12: CV prose and contact links. */
  profile?: Partial<Pick<AboutContent, 'cv_headline' | 'cv_profile' | 'cv_ai_workflow' | 'contact'>> | null
  /** H-17: first recommendation with show_on_cv, or null. */
  recommendation?: Recommendation | null
}

/** The API returns `gpa`; the UI reads `grade`. Map it in one place. */
export function normaliseEducation(entry: Education): Education {
  return { ...entry, grade: entry.grade ?? entry.gpa ?? null }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function fetchProjects() {
  return fetchList<Project>(`${API_BASE_URL}/projects`, 'projects', { cache: 'no-store' })
}

export async function fetchProjectById(id: string | number) {
  return fetchSingle<Project>(`${API_BASE_URL}/projects/${id}`, 'project', { cache: 'no-store' })
}

export async function fetchProjectBySlug(slug: string) {
  return fetchSingle<Project>(`${API_BASE_URL}/projects/slug/${slug}`, 'project', { cache: 'no-store' })
}

/** `limit` is passed through as `?limit=` (API default 50, max 100). */
export async function fetchBlogPosts(options?: { limit?: number }) {
  const query = options?.limit ? `?limit=${options.limit}` : ''
  return fetchList<BlogPost>(`${API_BASE_URL}/blog${query}`, 'blog posts')
}

export async function fetchBlogPostBySlug(slug: string) {
  return fetchSingle<BlogPost>(`${API_BASE_URL}/blog/${slug}`, 'blog post', { cache: 'no-store' })
}

export async function fetchLearning() {
  return fetchList<LearningItem>(`${API_BASE_URL}/learning`, 'learning items')
}

export async function fetchSkills() {
  return fetchList<Skill>(`${API_BASE_URL}/skills`, 'skills', { cache: 'no-store' })
}

export async function fetchWorkHistory() {
  const roles = await fetchList<WorkRole>(`${API_BASE_URL}/work-history`, 'work history')
  return roles.map((role) => ({
    ...role,
    achievements: asArray<string>(role.achievements),
    technologies: asArray<string>(role.technologies),
    highlights: asArray<string>(role.highlights),
  }))
}

export async function fetchEducation() {
  const entries = await fetchList<Education>(`${API_BASE_URL}/education`, 'education')
  return entries.map(normaliseEducation)
}

export async function fetchCertifications() {
  return fetchList<Certification>(`${API_BASE_URL}/certifications`, 'certifications')
}

/** GET /api/cv (H-12). Any failure throws: a CV with a silently missing section is worse than an error. */
export async function fetchCv(): Promise<CvData> {
  const data = await fetchSingle<CvData>(`${API_BASE_URL}/cv`, 'CV', { cache: 'no-store' })
  if (!data) throw new ApiUnavailableError('The CV endpoint is not available yet.')
  return {
    ...data,
    experience: asArray<WorkRole>(data.experience),
    skills: asArray<{ category: string; items: Skill[] }>(data.skills),
    projects: asArray<Project>(data.projects),
    education: asArray<Education>(data.education).map(normaliseEducation),
    learning: asArray<LearningItem>(data.learning),
    certifications: asArray<Certification>(data.certifications),
  }
}

/** GET /api/content/about (H-16). Throws when unavailable; About falls back to the seed copy. */
export async function fetchAbout(): Promise<AboutContent> {
  const data = await fetchSingle<AboutContent>(`${API_BASE_URL}/content/about`, 'about content', { cache: 'no-store' })
  if (!data) throw new ApiUnavailableError('The about content endpoint is not available yet.')
  return data
}

/** GET /api/recommendations (H-17), in API order. */
export async function fetchRecommendations() {
  return fetchList<Recommendation>(`${API_BASE_URL}/recommendations`, 'recommendations', { cache: 'no-store' })
}

// ---------- contact (H-10) ----------

export type ContactKind = 'role' | 'freelance' | 'hi'

export interface ContactPayload {
  kind: ContactKind
  name: string
  email: string
  message: string
  website: ''
  source_path: string
}

export type ContactResult =
  | { ok: true }
  | { ok: false; reason: 'invalid'; fields: string[] }
  | { ok: false; reason: 'rate_limited' | 'error' }

/** POST /api/contact. Never throws; returns what the modal needs to show. */
export async function submitContact(payload: ContactPayload): Promise<ContactResult> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error('Error sending contact message:', error)
    return { ok: false, reason: 'error' }
  }
  if (response.ok) return { ok: true }
  if (response.status === 429) return { ok: false, reason: 'rate_limited' }
  if (response.status === 400) {
    try {
      const body = await response.json()
      const fields = asArray<{ path?: string }>(body?.details)
        .map((d) => d.path)
        .filter((p): p is string => typeof p === 'string')
      if (fields.length) return { ok: false, reason: 'invalid', fields }
    } catch {
      // fall through to a generic error
    }
  }
  return { ok: false, reason: 'error' }
}
