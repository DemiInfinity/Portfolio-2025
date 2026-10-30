import { getServices } from '.'
import { FieldError } from '../utils/validation'

/**
 * Editable site content (H-16 / D-1, D-6), stored in `site_content` as one
 * JSONB document per key. Only `about` exists today.
 */

export interface AboutContent {
  intro: string[]
  looking_for: { summary: string; items: { label: string; value: string }[] }
  open_to_work_off_line: string
  cv_headline: string
  cv_profile: string
  cv_ai_workflow: string
  contact: { email: string; linkedin_url: string; github_url: string; portfolio_url: string; location: string }
}

/** Same copy as the migration seed, so a missing row changes nothing visible. */
export const ABOUT_DEFAULTS: AboutContent = {
  intro: [
    "I'm Demi, a full-stack software engineer with five years of building real products: payroll platforms, learning platforms, desktop tools and, after hours, my own apps.",
    "I love the whole stack, but my heart is in the front end and the systems behind it: component libraries, design tokens and the small details that make an interface feel finished. These days I'm also deep into AI tooling, building MCP servers that help developers generate code that actually fits their design system."
  ],
  looking_for: {
    summary: "A remote role I can do from anywhere. I'm set up for remote work and open to working as a digital nomad.",
    items: [
      { label: 'Work style', value: 'Fully remote, digital nomad friendly' },
      { label: 'Roles', value: 'Full-stack or frontend-leaning engineer' },
      { label: 'Sweet spot', value: 'Design systems, component libraries, AI tooling' },
      { label: 'Based', value: 'UK, flexible across time zones' },
      { label: 'Also open to', value: 'Freelance projects' }
    ]
  },
  open_to_work_off_line: 'Happily at Cintra, always up for a chat',
  cv_headline: 'Full-stack Software Engineer',
  cv_profile:
    "Full-stack software engineer with five years' experience building enterprise platforms, desktop tools and creator products. I specialise in component libraries and design systems, care as much about how software looks as how it runs, and work with a pragmatic, AI-assisted workflow. Looking for a fully remote role, and open to working as a digital nomad.",
  cv_ai_workflow:
    'AI-assisted, never AI-driven: I own the problem, the architecture and the final review, and use AI to move faster. Claude daily at work and at home; experience with Cursor; ChatGPT, moving to Codex at work. Built an MCP server so AI tools generate code that fits our design system.',
  contact: {
    email: 'demi.21@outlook.com',
    linkedin_url: 'https://www.linkedin.com/in/demi-taylor-nimmo-bb320b40',
    github_url: 'https://github.com/DemiInfinity',
    portfolio_url: 'https://www.demitaylornimmo.com',
    location: 'UK · Remote'
  }
}

const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Stored document over the defaults: missing keys (or wrong types) take the default. */
export function mergeAbout(stored: unknown): AboutContent {
  const s = isObj(stored) ? stored : {}
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d)
  const lf = isObj(s.looking_for) ? s.looking_for : {}
  const c = isObj(s.contact) ? s.contact : {}
  return {
    intro: Array.isArray(s.intro) && s.intro.every((p: unknown) => typeof p === 'string') ? s.intro : ABOUT_DEFAULTS.intro,
    looking_for: {
      summary: str(lf.summary, ABOUT_DEFAULTS.looking_for.summary),
      items: Array.isArray(lf.items)
        ? lf.items.filter(isObj).map((i: any) => ({ label: String(i.label ?? ''), value: String(i.value ?? '') }))
        : ABOUT_DEFAULTS.looking_for.items
    },
    open_to_work_off_line: str(s.open_to_work_off_line, ABOUT_DEFAULTS.open_to_work_off_line),
    cv_headline: str(s.cv_headline, ABOUT_DEFAULTS.cv_headline),
    cv_profile: str(s.cv_profile, ABOUT_DEFAULTS.cv_profile),
    cv_ai_workflow: str(s.cv_ai_workflow, ABOUT_DEFAULTS.cv_ai_workflow),
    contact: {
      email: str(c.email, ABOUT_DEFAULTS.contact.email),
      linkedin_url: str(c.linkedin_url, ABOUT_DEFAULTS.contact.linkedin_url),
      github_url: str(c.github_url, ABOUT_DEFAULTS.contact.github_url),
      portfolio_url: str(c.portfolio_url, ABOUT_DEFAULTS.contact.portfolio_url),
      location: str(c.location, ABOUT_DEFAULTS.contact.location)
    }
  }
}

/** Table missing (migration not run yet). */
export function isMissingTableError(error: any): boolean {
  return Boolean(error) && (error.code === '42P01' || error.code === 'PGRST205' || /relation .* does not exist|could not find the table/i.test(String(error.message || '')))
}

/** The About document and when it last changed (`updated_at` null when there is no row). */
export async function getAbout(): Promise<{ value: AboutContent; updated_at: string | null }> {
  const { data, error } = await getServices().supabaseService.getClient()
    .from('site_content')
    .select('key, value, updated_at')
    .eq('key', 'about')
    .maybeSingle()
  if (error && !isMissingTableError(error)) throw error
  if (!data) return { value: mergeAbout(null), updated_at: null }
  return { value: mergeAbout(data.value), updated_at: data.updated_at ?? null }
}

// ---------- validation (PUT is a full replace) ----------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function httpOrEmpty(v: string): boolean {
  if (v === '') return true
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateAbout(input: unknown): { value: AboutContent | null; errors: FieldError[] } {
  const errors: FieldError[] = []
  const err = (path: string, msg: string) => errors.push({ path, msg })
  if (!isObj(input)) return { value: null, errors: [{ path: 'body', msg: 'Send the About object' }] }

  const allowed = ['intro', 'looking_for', 'open_to_work_off_line', 'cv_headline', 'cv_profile', 'cv_ai_workflow', 'contact']
  for (const k of Object.keys(input)) if (!allowed.includes(k)) err(k, 'Unknown field')

  const text = (path: string, v: unknown, min: number, max: number): string => {
    if (typeof v !== 'string') {
      err(path, min > 0 ? 'Required' : 'Must be text')
      return ''
    }
    const s = v.trim()
    if (s.length < min) err(path, 'Required')
    else if (s.length > max) err(path, `At most ${max} characters`)
    return s
  }

  let intro: string[] = []
  if (!Array.isArray(input.intro)) err('intro', 'Add 1 to 6 paragraphs')
  else {
    if (input.intro.length < 1 || input.intro.length > 6) err('intro', 'Add 1 to 6 paragraphs')
    intro = input.intro.map((p: unknown, i: number) => text(`intro[${i}]`, p, 1, 2000))
  }

  const lf = input.looking_for
  let summary = ''
  let items: { label: string; value: string }[] = []
  if (!isObj(lf)) err('looking_for', 'Required')
  else {
    for (const k of Object.keys(lf)) if (!['summary', 'items'].includes(k)) err(`looking_for.${k}`, 'Unknown field')
    summary = text('looking_for.summary', lf.summary, 0, 600)
    if (!Array.isArray(lf.items)) err('looking_for.items', 'Must be a list')
    else {
      if (lf.items.length > 8) err('looking_for.items', 'At most 8 items')
      items = lf.items.map((it: unknown, i: number) => {
        const p = `looking_for.items[${i}]`
        if (!isObj(it)) {
          err(p, 'Must be an object')
          return { label: '', value: '' }
        }
        for (const k of Object.keys(it)) if (!['label', 'value'].includes(k)) err(`${p}.${k}`, 'Unknown field')
        return { label: text(`${p}.label`, it.label, 1, 40), value: text(`${p}.value`, it.value, 1, 120) }
      })
    }
  }

  const c = input.contact
  const contact = { email: '', linkedin_url: '', github_url: '', portfolio_url: '', location: '' }
  if (!isObj(c)) err('contact', 'Required')
  else {
    const keys = Object.keys(contact)
    for (const k of Object.keys(c)) if (!keys.includes(k)) err(`contact.${k}`, 'Unknown field')
    contact.email = text('contact.email', c.email, 1, 254)
    if (contact.email && !EMAIL_RE.test(contact.email)) err('contact.email', 'Enter a valid email address')
    for (const k of ['linkedin_url', 'github_url', 'portfolio_url'] as const) {
      contact[k] = text(`contact.${k}`, c[k] ?? '', 0, 500)
      if (!httpOrEmpty(contact[k])) err(`contact.${k}`, 'Must start with http:// or https://')
    }
    contact.location = text('contact.location', c.location ?? '', 0, 80)
  }

  const value: AboutContent = {
    intro,
    looking_for: { summary, items },
    open_to_work_off_line: text('open_to_work_off_line', input.open_to_work_off_line, 1, 120),
    cv_headline: text('cv_headline', input.cv_headline, 1, 80),
    cv_profile: text('cv_profile', input.cv_profile, 1, 1200),
    cv_ai_workflow: text('cv_ai_workflow', input.cv_ai_workflow ?? '', 0, 1200),
    contact
  }
  return errors.length ? { value: null, errors } : { value, errors }
}

export async function saveAbout(value: AboutContent): Promise<{ value: AboutContent; updated_at: string }> {
  const updated_at = new Date().toISOString()
  const { error } = await getServices().supabaseService.getClient()
    .from('site_content')
    .upsert({ key: 'about', value, updated_at }, { onConflict: 'key' })
  if (error) throw error
  return { value, updated_at }
}
