import { summariseAnalytics, referrerSource, summaryWindow, PageViewRow } from '../analyticsSummary'

const NOW = new Date('2026-10-27T09:41:00.000Z')

describe('referrerSource', () => {
  it.each([
    ['https://www.linkedin.com/feed', 'linkedin.com'],
    ['', 'Direct'],
    [null, 'Direct'],
    ['https://demitaylornimmo.com/projects', 'Direct'],
    ['https://www.demitaylornimmo.com/', 'Direct'],
    ['https://admin.demitaylornimmo.com/', 'Direct'],
    ['http://localhost:3000/', 'Direct'],
    ['https://portfolio-abc.vercel.app/x', 'Direct'],
    ['https://google.com', 'google.com'],
    ['google.com/search', 'google.com'],
    ['not a url at all', 'Direct']
  ])('%p → %s', (input, out) => {
    expect(referrerSource(input as any)).toBe(out)
  })
})

describe('summariseAnalytics', () => {
  // 3 days (25th-27th), 4 sessions
  const rows: PageViewRow[] = [
    { session_id: 'a', page_path: '/', page_title: 'Home', referrer: 'https://www.linkedin.com/feed', visit_duration: 30, created_at: '2026-10-25T10:00:00+00:00' },
    { session_id: 'a', page_path: '/projects', page_title: 'Projects', referrer: 'https://demitaylornimmo.com/', visit_duration: 60, created_at: '2026-10-25T10:01:00+00:00' },
    { session_id: 'b', page_path: '/', page_title: '', referrer: '', visit_duration: 0, created_at: '2026-10-26T12:00:00+00:00' },
    { session_id: 'c', page_path: '/', page_title: 'Home v2', referrer: 'https://demitaylornimmo.com/projects', visit_duration: 90, created_at: '2026-10-27T08:00:00+00:00' },
    { session_id: 'd', page_path: '/blog', page_title: null, referrer: 'https://google.com', visit_duration: 20, created_at: '2026-10-27T09:00:00+00:00' },
    // outside the window: ignored
    { session_id: 'z', page_path: '/', referrer: 'https://bing.com', visit_duration: 999, created_at: '2026-10-24T23:59:59+00:00' }
  ]

  const s = summariseAnalytics(rows, 3, NOW)

  it('range, totals and averages', () => {
    expect(s.range).toEqual({ from: '2026-10-25', to: '2026-10-27', days: 3 })
    expect(s.generatedAt).toBe('2026-10-27T09:41:00.000Z')
    expect(s.visits).toBe(4)
    expect(s.pageViews).toBe(5)
    expect(s.avgSecondsPerView).toBe(40) // 200 / 5
  })

  it('referrers per visit from the first row, ties by source', () => {
    expect(s.referrers).toEqual([
      { source: 'Direct', visits: 2 },
      { source: 'google.com', visits: 1 },
      { source: 'linkedin.com', visits: 1 }
    ])
    expect(s.referrers.reduce((n, r) => n + r.visits, 0)).toBe(s.visits)
  })

  it('daily is zero-filled, ascending, one entry per day', () => {
    expect(s.daily).toEqual([
      { date: '2026-10-25', visits: 1 },
      { date: '2026-10-26', visits: 1 },
      { date: '2026-10-27', visits: 2 }
    ])
    const quiet = summariseAnalytics([], 3, NOW)
    expect(quiet.daily.map((d) => d.visits)).toEqual([0, 0, 0])
    expect(quiet.avgSecondsPerView).toBe(0)
    expect(quiet.referrers).toEqual([])
  })

  it('pages: views desc, latest non-empty title, avg seconds', () => {
    expect(s.pages).toEqual([
      { path: '/', title: 'Home v2', views: 3, avgSeconds: 40 },
      { path: '/blog', title: null, views: 1, avgSeconds: 20 },
      { path: '/projects', title: 'Projects', views: 1, avgSeconds: 60 }
    ])
  })

  it('rows without a session count as one visit each', () => {
    const r = summariseAnalytics(
      [
        { session_id: null, page_path: '/', created_at: '2026-10-27T01:00:00Z' },
        { session_id: null, page_path: '/', created_at: '2026-10-27T02:00:00Z' }
      ],
      1,
      NOW
    )
    expect(r.visits).toBe(2)
    expect(r.referrers).toEqual([{ source: 'Direct', visits: 2 }])
  })

  it('window covers whole UTC days ending today', () => {
    const w = summaryWindow(30, NOW)
    expect(w.dates).toHaveLength(30)
    expect(w.from).toBe('2026-09-28')
    expect(w.toExclusiveIso).toBe('2026-10-28T00:00:00.000Z')
  })
})
