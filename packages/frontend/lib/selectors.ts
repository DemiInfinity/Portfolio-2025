import type { BlogPost, Education, Project, WorkRole } from './api'
import { yearsSince } from './format'

/** Home "Recent work": the featured project first, then the most recent others (API order), 3 in total. */
export function pickRecentWork<T extends Pick<Project, 'featured'>>(projects: T[], count = 3): T[] {
  const featured = projects.find((p) => p.featured)
  const rest = projects.filter((p) => p !== featured)
  return (featured ? [featured, ...rest] : rest).slice(0, count)
}

/** "5+" from the earliest role's start date; null when unknown. */
export function yearsStat(roles: Pick<WorkRole, 'start_date'>[]): string | null {
  const starts = roles.map((r) => r.start_date).filter(Boolean).sort()
  if (!starts.length) return null
  const years = yearsSince(starts[0])
  return years > 0 ? `${years}+` : null
}

/** "BSc Computer Science", without repeating the field when the degree already includes it. */
export function degreeTitle(entry: Pick<Education, 'degree' | 'field_of_study'>): string {
  const degree = (entry.degree || '').trim()
  const field = (entry.field_of_study || '').trim()
  if (!field || degree.toLowerCase().includes(field.toLowerCase())) return degree
  return `${degree} ${field}`.trim()
}

/** Home stat: big "BSc", small "Computer Science, Teesside". */
export function degreeStat(entry: Pick<Education, 'degree' | 'field_of_study' | 'institution'>): { value: string; label: string } | null {
  const degree = (entry.degree || '').trim()
  if (!degree) return null
  const [abbrev, ...restWords] = degree.split(/\s+/)
  const field = (entry.field_of_study || restWords.join(' ')).trim()
  const place = (entry.institution || '').replace(/^University of\s+/i, '').replace(/\s+University$/i, '').trim()
  return { value: abbrev, label: [field, place].filter(Boolean).join(', ') }
}

/** Year part of a date string ("2016"). */
export function yearOf(value: string | null | undefined): string {
  const match = /^(\d{4})/.exec(value || '')
  return match ? match[1] : ''
}

/** Blog: categories with counts, in first-seen order. */
export function categoryCounts(posts: Pick<BlogPost, 'category'>[]): { name: string; count: number }[] {
  const map = new Map<string, number>()
  for (const post of posts) {
    const name = (post.category || '').trim()
    if (!name) continue
    map.set(name, (map.get(name) ?? 0) + 1)
  }
  return Array.from(map, ([name, count]) => ({ name, count }))
}

/**
 * Blog selection. Under "All": the featured post (or the newest) as the big
 * card, the rest in "More posts". Under a category: no big card, every post
 * of that category (the featured one included).
 */
export function selectBlogView<T extends Pick<BlogPost, 'featured' | 'category'>>(
  posts: T[],
  category: string | null
): { featured: T | null; rest: T[] } {
  if (category) return { featured: null, rest: posts.filter((p) => (p.category || '').trim() === category) }
  const featured = posts.find((p) => p.featured) ?? posts[0] ?? null
  return { featured, rest: posts.filter((p) => p !== featured) }
}

/** Post "Keep reading": other posts, same category first, then newest (API order is newest first). */
export function keepReading<T extends Pick<BlogPost, 'slug' | 'category'>>(posts: T[], current: Pick<BlogPost, 'slug' | 'category'>, count = 2): T[] {
  const others = posts.filter((p) => p.slug !== current.slug)
  const same = others.filter((p) => current.category && p.category === current.category)
  const rest = others.filter((p) => !same.includes(p))
  return [...same, ...rest].slice(0, count)
}

/** Case study "Next project": the next in list order, wrapping to the first. */
export function nextProject<T extends Pick<Project, 'slug'>>(projects: T[], slug: string): T | null {
  if (projects.length < 2) return null
  const index = projects.findIndex((p) => p.slug === slug)
  if (index === -1) return projects[0]
  return projects[(index + 1) % projects.length]
}

/** Tags arrive as an array or, from older rows, a JSON string. */
export function postTags(post: Pick<BlogPost, 'tags'>): string[] {
  const raw = post.tags as unknown
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string' && t.trim() !== '')
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string') : []
    } catch {
      return raw.split(',').map((t) => t.trim()).filter(Boolean)
    }
  }
  return []
}

/** "3 min read" (empty when unknown). */
export function readTime(post: Pick<BlogPost, 'read_time'>): string {
  const n = Number(post.read_time)
  return Number.isFinite(n) && n > 0 ? `${Math.round(n)} min read` : ''
}

export function postDate(post: Pick<BlogPost, 'publish_date' | 'created_at'>): string | null | undefined {
  return post.publish_date || post.created_at
}
