/**
 * QA acceptance tests for the [UNIT] criteria in plan-frontend.md, written from the criteria
 * (exact values) rather than from the implementation. Owner: frontend QA.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { formatLongDate, formatRange } from '@/lib/format'
import { fetchBlogPosts } from '@/lib/api'
import { selectBlogView, keepReading, pickRecentWork, nextProject } from '@/lib/selectors'
import { courseMeta, progressLabel, masteredSkills } from '@/components/learning/learning'
import PageLoading from '@/components/PageLoading'
import Modal from '@/components/overlays/Modal'

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('F-2 AC1 formatRange (exact strings from the plan)', () => {
  it('site, open-ended', () => expect(formatRange('2025-08-01', null, 'site')).toBe('Aug 2025 – now'))
  it('site, same year', () => expect(formatRange('2024-06-01', '2024-08-01', 'site')).toBe('Jun – Aug 2024'))
  it('cv, same year keeps both years', () => expect(formatRange('2024-06-01', '2024-08-01', 'cv')).toBe('Jun 2024 – Aug 2024'))
  it('cv, open-ended', () => expect(formatRange('2025-08-01', null, 'cv')).toBe('Aug 2025 – Present'))
  it('site, different years', () => expect(formatRange('2022-07-01', '2024-06-01', 'site')).toBe('Jul 2022 – Jun 2024'))
  it('uses an en dash with spaces, never a hyphen', () => {
    expect(formatRange('2022-07-01', '2024-06-01', 'site')).not.toMatch(/ - /)
  })
})

describe('F-2 AC2 formatLongDate', () => {
  it('7 January 2026, no leading zero', () => expect(formatLongDate('2026-01-07')).toBe('7 January 2026'))
  it('1 April 2026 from a full ISO timestamp', () => expect(formatLongDate('2026-04-01T09:00:00.000Z')).toBe('1 April 2026'))
})

describe('F-2 AC3 fetchBlogPosts', () => {
  it('requests /blog?limit=100', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, data: [] }) })
    global.fetch = fetchMock as unknown as typeof fetch
    await fetchBlogPosts({ limit: 100 })
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/blog\?limit=100$/)
  })
})

describe('F-4 AC4 scroll lock', () => {
  it('locks body scroll while open and restores the previous value on close', () => {
    document.body.style.overflow = 'auto'
    const { unmount } = render(
      <Modal labelledBy="t" onClose={() => {}}>
        <h2 id="t">Title</h2>
        <button type="button">Inside</button>
      </Modal>
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('auto')
  })

  it('moves focus into the dialog and names it', () => {
    render(
      <Modal labelledBy="t2" onClose={() => {}}>
        <h2 id="t2">Named dialog</h2>
        <button type="button">First</button>
      </Modal>
    )
    expect(screen.getByRole('dialog', { name: 'Named dialog' })).toHaveAttribute('aria-modal', 'true')
    expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull()
  })

  it('Escape calls onClose', () => {
    const onClose = vi.fn()
    render(
      <Modal labelledBy="t3" onClose={onClose}>
        <h2 id="t3">Esc</h2>
        <button type="button">x</button>
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('F-9 AC1 PageLoading', () => {
  it('has role=status with "Waking the server…"', () => {
    render(<PageLoading />)
    expect(screen.getByRole('status')).toHaveTextContent('Waking the server…')
    expect(screen.getByRole('status')).toHaveTextContent('It naps when nobody’s around. Give it a few seconds.')
  })
})

describe('F-16 AC5 blog selection', () => {
  const posts = [
    { slug: 'a', category: 'Frontend', featured: false },
    { slug: 'b', category: 'Backend', featured: true },
    { slug: 'c', category: 'Frontend', featured: false },
  ]
  it('All with a featured post: featured is the big card, the other two below', () => {
    const view = selectBlogView(posts, null)
    expect(view.featured?.slug).toBe('b')
    expect(view.rest.map((p) => p.slug)).toEqual(['a', 'c'])
  })
  it('All without a featured post: the newest (first in API order)', () => {
    const view = selectBlogView(posts.map((p) => ({ ...p, featured: false })), null)
    expect(view.featured?.slug).toBe('a')
    expect(view.rest).toHaveLength(2)
  })
  it('category containing the featured post: no big card, the featured post listed', () => {
    const view = selectBlogView(posts, 'Backend')
    expect(view.featured).toBeNull()
    expect(view.rest.map((p) => p.slug)).toEqual(['b'])
  })
  it('empty list', () => {
    expect(selectBlogView([], null)).toEqual({ featured: null, rest: [] })
  })
})

describe('Selectors from the criteria (F-11 AC3, F-13 AC9, F-17 AC5)', () => {
  const five = [1, 2, 3, 4, 5].map((n) => ({ slug: `p${n}`, featured: n === 4 }))
  it('Recent work: featured #4 then #1, #2', () => {
    expect(pickRecentWork(five).map((p) => p.slug)).toEqual(['p4', 'p1', 'p2'])
  })
  it('Recent work: hidden featured project (not in the list) gives the three most recent', () => {
    expect(pickRecentWork(five.filter((p) => !p.featured)).map((p) => p.slug)).toEqual(['p1', 'p2', 'p3'])
  })
  it('Next project wraps', () => {
    expect(nextProject(five, 'p5')?.slug).toBe('p1')
    expect(nextProject(five, 'p2')?.slug).toBe('p3')
  })
  it('Keep reading: two, same category first, never the current post', () => {
    const list = [
      { slug: 'n1', category: 'Desktop' },
      { slug: 'n2', category: 'Frontend' },
      { slug: 'cur', category: 'Frontend' },
      { slug: 'n3', category: 'Frontend' },
    ]
    expect(keepReading(list, { slug: 'cur', category: 'Frontend' }).map((p) => p.slug)).toEqual(['n2', 'n3'])
  })
})

describe('F-15 learning formats', () => {
  it('"{n}%" or "Just started" under 5', () => {
    expect(progressLabel({ progress: 19 })).toBe('19%')
    expect(progressLabel({ progress: 5 })).toBe('5%')
    expect(progressLabel({ progress: 4 })).toBe('Just started')
    expect(progressLabel({ progress: null })).toBe('Just started')
  })
  it('course meta drops missing parts (provider null before the migration)', () => {
    expect(courseMeta({ provider: 'Udemy', start_date: '2025-04-01', estimated_completion: '2025-12-01' })).toBe(
      'Udemy · Started April 2025 · Target December 2025'
    )
    expect(courseMeta({ provider: null, start_date: '2025-04-01', estimated_completion: null })).toBe('Started April 2025')
    expect(courseMeta({ start_date: null, estimated_completion: null } as never)).toBe('')
  })
  it('skills mastered = advanced and expert only', () => {
    const skills = [
      { id: 1, name: 'A', level: 'expert' },
      { id: 2, name: 'B', level: 'Advanced' },
      { id: 3, name: 'C', level: 'beginner' },
      { id: 4, name: 'D', level: null },
    ]
    expect(masteredSkills(skills).map((s) => s.name)).toEqual(['A', 'B'])
  })
})

describe('F-8 AC3 footer copyright', () => {
  it('© {current year} Demi Taylor Nimmo', async () => {
    const { default: Footer } = await import('@/components/Footer')
    render(<Footer />)
    await waitFor(() => expect(screen.getByText(`© ${new Date().getFullYear()} Demi Taylor Nimmo`)).toBeInTheDocument())
  })
})
