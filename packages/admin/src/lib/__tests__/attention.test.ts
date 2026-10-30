import { describe, it, expect } from 'vitest'
import { computeAttention, finding, type AttentionInput } from '../attention'

const today = new Date(2026, 9, 27, 9)
const base: AttentionInput = {
  courses: [
    { title: 'The Complete Full-Stack Web Development Bootcamp', progress: 19, status: 'in_progress' },
    { title: 'The Complete Cypress v13 Course: Automation Testing Bootcamp', progress: 15, status: 'in_progress', estimated_completion: '2025-12-01' },
  ],
  cv: { state: 'idle', generatedAt: null, error: null, pdfUrl: null, size: null },
  certCount: 0,
  latestPost: { title: 'How I Built Automatic Updates Into a Desktop App (Without the Headache)', publish_date: '2026-04-01T00:00:00Z' },
}

describe('computeAttention', () => {
  it('lists overdue course, no CV, no certs and the last post, in order', () => {
    const items = computeAttention(base, today)
    expect(items.map((i) => i.title)).toEqual([
      'The Complete Cypress v13 Course passed its target',
      'No CV PDF yet',
      'No certifications listed',
      'Last post was 209 days ago',
    ])
    expect(items[0].detail).toBe('Target was December 2025. Progress is 15%.')
    expect(items[3].detail).toBe('“How I Built Automatic Updates Into a Desktop App”, 1 Apr 2026.')
    expect(items[3].href).toBe('/blog?new=1')
    expect(finding(base, today)).toBe('1 course is past its target and no CV PDF is built yet, so the Download CV button is hidden.')
  })

  it('gives exactly one item when nothing is wrong', () => {
    const ok = { ...base, courses: [base.courses[0]], cv: { ...base.cv!, generatedAt: '2026-10-27T09:00:00Z' }, certCount: 2 }
    expect(computeAttention(ok, today)).toHaveLength(1)
    expect(finding(ok, today)).toBe('Nothing needs fixing. Your last post was 209 days ago.')
  })

  it('reports a failed build', () => {
    const failed = { ...base, cv: { ...base.cv!, state: 'failed' as const, error: 'Font missing.' } }
    const items = computeAttention(failed, today)
    expect(items[1]).toMatchObject({ title: 'CV PDF build failed', detail: 'Visitors still download the previous version. Font missing.', pill: 'Failed', action: 'Regenerate' })
    expect(finding(failed, today)).toBe('1 course is past its target and the last CV PDF build failed.')
  })

  it('pluralises courses', () => {
    const two = { ...base, courses: [base.courses[1], { ...base.courses[1], title: 'B' }], cv: null }
    expect(finding(two, today)).toBe('2 courses are past their target.')
  })

  it('puts unread messages first, linking to /messages, and skips them at 0', () => {
    const items = computeAttention({ ...base, unread: 2 }, today)
    expect(items[0]).toMatchObject({ title: '2 unread messages', action: 'Read messages', href: '/messages' })
    expect(computeAttention({ ...base, unread: 1 }, today)[0].title).toBe('1 unread message')
    expect(computeAttention({ ...base, unread: 0 }, today).some((i) => i.href === '/messages')).toBe(false)
  })
})
