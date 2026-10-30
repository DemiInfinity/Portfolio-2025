import { SITE_URL } from './config'

export const LINKEDIN_MAX = 3000

export type ShareKind = 'post' | 'project'
export type Starter = 'announce' | 'lesson' | 'short'
export type ShareItem = { kind: ShareKind; title: string; slug: string; summary: string; tags: string[]; image: string | null }

export const STARTERS: { value: Starter; label: string }[] = [
  { value: 'announce', label: 'New post' },
  { value: 'lesson', label: 'Lesson learned' },
  { value: 'short', label: 'Just the link' },
]

/** Public page URL: /blog/<slug> for posts, /projects/<slug> for projects, on VITE_SITE_URL. */
export const publicUrl = (kind: ShareKind, slug: string, site = SITE_URL) => `${site.replace(/\/$/, '')}/${kind === 'post' ? 'blog' : 'projects'}/${encodeURIComponent(slug)}`

export const linkedInShareUrl = (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`

/** "#Tag" per tag with spaces and punctuation removed ("C# / .NET" -> "#CNET", "AWS Lambda" -> "#AWSLambda"); blanks and repeats dropped. */
export function hashtags(tags: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tags) {
    const clean = t.replace(/[^\p{L}\p{N}]+/gu, '')
    if (!clean || seen.has(clean.toLowerCase())) continue
    seen.add(clean.toLowerCase())
    out.push('#' + clean)
  }
  return out.join(' ')
}

const join = (...parts: (string | false | undefined)[]) => parts.filter((p): p is string => !!p && !!p.trim()).join('\n\n')

/** The starter texts from AdminShare. Projects say "New project" / "See it here" in place of the post wording. */
export function starterText(item: ShareItem, starter: Starter, site = SITE_URL) {
  const url = publicUrl(item.kind, item.slug, site)
  const tags = hashtags(item.tags)
  const summary = item.summary.trim()
  if (starter === 'short') return `${item.title}\n${url}`
  if (starter === 'lesson') return join('Something I learned the hard way, written up:', summary, url, tags)
  return item.kind === 'post'
    ? join(`New post: ${item.title}`, summary, `Read it here: ${url}`, tags)
    : join(`New project: ${item.title}`, summary, `See it here: ${url}`, tags)
}

export const counterLabel = (text: string) => `${text.length.toLocaleString('en-GB')} / 3,000 characters`
export const isOver = (text: string) => text.length > LINKEDIN_MAX
