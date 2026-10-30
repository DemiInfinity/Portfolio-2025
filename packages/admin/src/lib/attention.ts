import type { CvStatus } from './cv'
import { dayOf, daysUntil, fmtDay, fmtMonth, isoDay } from './format'

export type AttentionItem = { title: string; detail: string; pill: string; tone: 'draft' | 'off' | 'neg' | 'hue'; action: string; href: string }

export type AttentionInput = {
  courses: { title: string; progress: number; status: string; estimated_completion?: string | null }[]
  cv: CvStatus | null | undefined
  certCount: number
  latestPost: { title: string; publish_date?: string } | undefined
  /** Unread Hire me messages (H-24). Only the count is used here, never message content. */
  unread?: number
}

const short = (t: string) => t.split(':')[0].trim()

export function overdueCourses(courses: AttentionInput['courses'], today: Date) {
  const t = isoDay(today)
  return courses.filter((c) => c.status !== 'completed' && !!c.estimated_completion && dayOf(c.estimated_completion) < t)
}

export const cvProblem = (cv: CvStatus | null | undefined): 'failed' | 'none' | null => {
  if (!cv) return null
  if (cv.state === 'failed') return 'failed'
  if (!cv.generatedAt && !(cv.state === 'pending' || cv.state === 'building')) return 'none'
  return null
}

export const daysSince = (iso: string, today: Date) => -daysUntil(iso, today)

/** The Dashboard's "Needs attention" list, in the plan's order. */
export function computeAttention(c: AttentionInput, today: Date): AttentionItem[] {
  const items: AttentionItem[] = []
  if (c.unread && c.unread > 0) {
    items.push({ title: `${c.unread} unread ${c.unread === 1 ? 'message' : 'messages'}`, detail: 'From the Hire me form. Reply by email from the inbox.', pill: 'Unread', tone: 'hue', action: 'Read messages', href: '/messages' })
  }
  for (const k of overdueCourses(c.courses, today)) {
    items.push({ title: `${short(k.title)} passed its target`, detail: `Target was ${fmtMonth(k.estimated_completion)}. Progress is ${k.progress}%.`, pill: 'Overdue', tone: 'draft', action: 'Update progress', href: '/learning' })
  }
  const cv = cvProblem(c.cv)
  if (cv === 'failed') {
    items.push({ title: 'CV PDF build failed', detail: `Visitors still download the previous version.${c.cv?.error ? ' ' + c.cv.error : ''}`, pill: 'Failed', tone: 'neg', action: 'Regenerate', href: '/settings' })
  } else if (cv === 'none') {
    items.push({ title: 'No CV PDF yet', detail: 'The Download CV button stays hidden on the site until one is built.', pill: 'Hidden on site', tone: 'off', action: 'Build the CV', href: '/settings' })
  }
  if (c.certCount === 0) {
    items.push({ title: 'No certifications listed', detail: 'The CV leaves out its Certifications section while this is empty.', pill: 'Empty', tone: 'off', action: 'Add one', href: '/certifications' })
  }
  if (c.latestPost?.publish_date) {
    const n = daysSince(c.latestPost.publish_date, today)
    items.push({ title: `Last post was ${n} days ago`, detail: `“${c.latestPost.title.split(' (')[0]}”, ${fmtDay(c.latestPost.publish_date)}.`, pill: `${n} days`, tone: 'hue', action: 'Write a post', href: '/blog?new=1' })
  } else {
    items.push({ title: 'No posts yet', detail: 'Write the first one and it shows on the blog.', pill: 'Empty', tone: 'off', action: 'Write a post', href: '/blog?new=1' })
  }
  return items
}

/** The Dashboard sub line. */
export function finding(c: AttentionInput, today: Date) {
  const o = overdueCourses(c.courses, today).length
  const cv = cvProblem(c.cv)
  const courses = o ? `${o} ${o === 1 ? 'course is' : 'courses are'} past its target`.replace('are past its', 'are past their') : ''
  if (o && cv === 'none') return `${courses} and no CV PDF is built yet, so the Download CV button is hidden.`
  if (o && cv === 'failed') return `${courses} and the last CV PDF build failed.`
  if (o) return `${courses}.`
  if (cv === 'none') return 'No CV PDF is built yet, so the Download CV button is hidden.'
  if (cv === 'failed') return 'The last CV PDF build failed.'
  const n = c.latestPost?.publish_date ? daysSince(c.latestPost.publish_date, today) : null
  return n === null ? 'Nothing needs fixing.' : `Nothing needs fixing. Your last post was ${n} days ago.`
}
