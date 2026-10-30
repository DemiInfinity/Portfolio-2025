/** About content (D-1, D-6, H-16): API <-> form mapping, limits, client validation and server path mapping. */
import { key } from './caseStudy'
import { EMAIL_RE, URL_RE } from './validation'

export type AboutApi = {
  intro: string[]
  looking_for: { summary: string; items: { label: string; value: string }[] }
  open_to_work_off_line: string
  cv_headline: string
  cv_profile: string
  cv_ai_workflow: string
  contact: { email: string; linkedin_url: string; github_url: string; portfolio_url: string; location: string }
  updated_at?: string | null
}

export type Para = { _k: string; text: string }
export type Detail = { _k: string; label: string; value: string }
export type AboutForm = {
  intro: Para[]
  summary: string
  items: Detail[]
  offLine: string
  headline: string
  profile: string
  ai: string
  email: string
  linkedin: string
  github: string
  portfolio: string
  location: string
}

export const ABOUT_LIMITS = { paras: 6, para: 2000, summary: 600, items: 8, label: 40, value: 120, offLine: 120, headline: 80, profile: 1200, ai: 1200, location: 80 } as const

export const newPara = (): Para => ({ _k: key(), text: '' })
export const newDetail = (): Detail => ({ _k: key(), label: '', value: '' })

export function toAboutForm(a: Partial<AboutApi> | undefined): AboutForm {
  const intro = (a?.intro || []).map((text) => ({ _k: key(), text }))
  return {
    intro: intro.length ? intro : [newPara()],
    summary: a?.looking_for?.summary || '',
    items: (a?.looking_for?.items || []).map((i) => ({ _k: key(), label: i.label || '', value: i.value || '' })),
    offLine: a?.open_to_work_off_line || '',
    headline: a?.cv_headline || '',
    profile: a?.cv_profile || '',
    ai: a?.cv_ai_workflow || '',
    email: a?.contact?.email || '',
    linkedin: a?.contact?.linkedin_url || '',
    github: a?.contact?.github_url || '',
    portfolio: a?.contact?.portfolio_url || '',
    location: a?.contact?.location || '',
  }
}

/** Comparable snapshot (ignores React keys). */
export const snapshot = (f: AboutForm) => JSON.stringify({ ...f, intro: f.intro.map((p) => p.text), items: f.items.map((i) => [i.label, i.value]) })

/** The full-replace PUT body (no `updated_at`): trimmed, empty detail rows dropped. Also returns sent->form index map for items. */
export function toAboutBody(f: AboutForm): { body: Omit<AboutApi, 'updated_at'>; itemIndex: number[] } {
  const itemIndex: number[] = []
  const items: { label: string; value: string }[] = []
  f.items.forEach((i, k) => {
    if (!i.label.trim() && !i.value.trim()) return
    itemIndex.push(k)
    items.push({ label: i.label.trim(), value: i.value.trim() })
  })
  return {
    body: {
      intro: f.intro.map((p) => p.text.trim()),
      looking_for: { summary: f.summary.trim(), items },
      open_to_work_off_line: f.offLine.trim(),
      cv_headline: f.headline.trim(),
      cv_profile: f.profile.trim(),
      cv_ai_workflow: f.ai.trim(),
      contact: { email: f.email.trim(), linkedin_url: f.linkedin.trim(), github_url: f.github.trim(), portfolio_url: f.portfolio.trim(), location: f.location.trim() },
    },
    itemIndex,
  }
}

const REQUIRED = 'Add some text.'
const over = (max: number) => `Keep this under ${max} characters.`

/** Errors keyed by form path (`intro.0`, `items.1.label`, `headline`, ...), in page order. */
export function validateAbout(f: AboutForm): Record<string, string> {
  const L = ABOUT_LIMITS
  const e: Record<string, string> = {}
  const text = (path: string, v: string, max: number, required: boolean) => {
    const t = v.trim()
    if (required && !t) e[path] = REQUIRED
    else if (t.length > max) e[path] = over(max)
  }
  f.intro.forEach((p, i) => text(`intro.${i}`, p.text, L.para, true))
  text('summary', f.summary, L.summary, false)
  f.items.forEach((it, i) => {
    if (!it.label.trim() && !it.value.trim()) return
    text(`items.${i}.label`, it.label, L.label, true)
    text(`items.${i}.value`, it.value, L.value, true)
  })
  text('offLine', f.offLine, L.offLine, true)
  text('headline', f.headline, L.headline, true)
  text('profile', f.profile, L.profile, true)
  text('ai', f.ai, L.ai, false)
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a full email address, like name@example.com.'
  for (const k of ['linkedin', 'github', 'portfolio'] as const) if (f[k].trim() && !URL_RE.test(f[k].trim())) e[k] = 'Use a full link starting with https://'
  text('location', f.location, L.location, false)
  return e
}

const FLAT: Record<string, keyof AboutForm> = {
  'looking_for.summary': 'summary', open_to_work_off_line: 'offLine', cv_headline: 'headline', cv_profile: 'profile', cv_ai_workflow: 'ai',
  'contact.email': 'email', 'contact.linkedin_url': 'linkedin', 'contact.github_url': 'github', 'contact.portfolio_url': 'portfolio', 'contact.location': 'location',
}

/** H-16 dotted server paths -> form paths. */
export function aboutPathToForm(path: string, itemIndex: number[]): string | null {
  if (FLAT[path]) return FLAT[path]
  let m = /^intro\[(\d+)\]$/.exec(path)
  if (m) return `intro.${m[1]}`
  if (path === 'intro') return 'intro.0'
  m = /^looking_for\.items\[(\d+)\]\.(label|value)$/.exec(path)
  if (m) return `items.${itemIndex[Number(m[1])] ?? Number(m[1])}.${m[2]}`
  return null
}
