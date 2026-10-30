import { describe, it, expect } from 'vitest'
import { pickRecentWork, yearsStat, degreeTitle, degreeStat, selectBlogView, categoryCounts, keepReading, nextProject } from '../selectors'
import { extractToc } from '@/components/Markdown'
import { normaliseCaseStudy, caseStudyToc } from '@/components/case-study/caseStudy'

const p = (slug: string, featured = false) => ({ slug, featured })

describe('pickRecentWork', () => {
  it('puts the featured project first, then the most recent others', () => {
    const list = [p('a'), p('b'), p('c'), p('d', true), p('e')]
    expect(pickRecentWork(list).map((x) => x.slug)).toEqual(['d', 'a', 'b'])
  })
  it('takes the three most recent without a featured project', () => {
    expect(pickRecentWork([p('a'), p('b'), p('c'), p('d')]).map((x) => x.slug)).toEqual(['a', 'b', 'c'])
  })
})

describe('stats', () => {
  it('years from the earliest role', () => {
    expect(yearsStat([{ start_date: '2025-08-01' }, { start_date: '2021-02-01' }])).toMatch(/^\d+\+$/)
    expect(yearsStat([])).toBeNull()
  })
  it('degree title and stat', () => {
    expect(degreeTitle({ degree: 'BSc', field_of_study: 'Computer Science' })).toBe('BSc Computer Science')
    expect(degreeTitle({ degree: 'BSc Computer Science', field_of_study: 'Computer Science' })).toBe('BSc Computer Science')
    expect(degreeStat({ degree: 'BSc', field_of_study: 'Computer Science', institution: 'Teesside University' })).toEqual({
      value: 'BSc',
      label: 'Computer Science, Teesside',
    })
  })
})

describe('blog selection', () => {
  const posts = [
    { slug: 'd', category: 'Desktop', featured: true },
    { slug: 'b', category: 'Backend', featured: false },
    { slug: 'f1', category: 'Frontend', featured: false },
    { slug: 'f2', category: 'Frontend', featured: false },
  ]
  it('counts categories', () => {
    expect(categoryCounts(posts)).toEqual([
      { name: 'Desktop', count: 1 },
      { name: 'Backend', count: 1 },
      { name: 'Frontend', count: 2 },
    ])
  })
  it('All: featured post, rest below', () => {
    const view = selectBlogView(posts, null)
    expect(view.featured?.slug).toBe('d')
    expect(view.rest).toHaveLength(3)
  })
  it('no featured post: the newest is the big card', () => {
    const view = selectBlogView(posts.map((x) => ({ ...x, featured: false })), null)
    expect(view.featured?.slug).toBe('d')
  })
  it('category: no big card, featured post included', () => {
    expect(selectBlogView(posts, 'Desktop')).toEqual({ featured: null, rest: [posts[0]] })
    expect(selectBlogView(posts, 'Frontend').rest.map((x) => x.slug)).toEqual(['f1', 'f2'])
  })
  it('keep reading: same category first, never the current post', () => {
    expect(keepReading(posts, posts[2]).map((x) => x.slug)).toEqual(['f2', 'd'])
  })
})

describe('next project', () => {
  it('wraps to the first', () => {
    const list = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }]
    expect(nextProject(list, 'a')?.slug).toBe('b')
    expect(nextProject(list, 'c')?.slug).toBe('a')
    expect(nextProject([{ slug: 'a' }], 'a')).toBeNull()
  })
})

describe('case study helpers', () => {
  it('TOC from ## headings', () => {
    expect(extractToc('## The problem\ntext')).toEqual([{ id: 'the-problem', label: 'The problem' }])
    expect(extractToc('```\n## not a heading\n```\n## Overview')).toEqual([{ id: 'overview', label: 'Overview' }])
  })
  it('lists only sections with content, in order', () => {
    const cs = normaliseCaseStudy({
      overview: 'o',
      problem: 'p',
      process: [{ label: 'A', title: 'A' }, { label: 'B', title: 'B' }],
      metrics: [{ value: '30%', label: 'lower costs' }, { value: '', label: 'dropped' }],
      architecture: { summary: '  ', steps: [] },
    })!
    expect(caseStudyToc(cs).map((t) => t.id)).toEqual(['overview', 'problem', 'process', 'outcome'])
    expect(cs.metrics).toHaveLength(1)
  })
  it('treats an all-empty case study as none', () => {
    expect(normaliseCaseStudy({ overview: '', features: [] })).toBeNull()
    expect(normaliseCaseStudy(null)).toBeNull()
  })
})
