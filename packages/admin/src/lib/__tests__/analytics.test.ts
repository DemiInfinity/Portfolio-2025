import { describe, it, expect } from 'vitest'
import { axisTop, buildAnalytics, stamp } from '../analytics'
import { SAMPLE } from '@/test/fixtures'

describe('analytics', () => {
  it('picks the axis top from the ladder', () => {
    expect(axisTop(61)).toBe(80)
    expect(axisTop(7)).toBe(10)
    expect(axisTop(0)).toBe(10)
    expect(axisTop(81)).toBe(100)
    expect(axisTop(900)).toBe(1000)
  })

  it('builds the design numbers from a summary', () => {
    const vm = buildAnalytics(SAMPLE)
    expect(vm.sub).toBe('28 Sep – 27 Oct 2026. LinkedIn brought 31% of visits; the busiest day was 13 Oct with 61.')
    expect(vm.kpis.map((k) => k.value)).toEqual(['688', '1,162', '1', '186'])
    expect(vm.kpis[0].caption).toBe('23 a day on average')
    expect(vm.kpis[1].caption).toBe('1.69 pages per visit')
    expect(vm.kpis[2].unit).toBe('m 33 s')
    expect(vm.kpis[3].caption).toBe('Automatic updates, 3 m 34 s a read')
    expect(vm.ticks.map((t) => t.label)).toEqual(['0', '20', '40', '60', '80'])
    expect(vm.bars).toHaveLength(30)
    expect(vm.bars.filter((b) => b.peak).map((b) => b.label)).toEqual(['13 Oct'])
    expect(vm.pages).toHaveLength(7)
    expect(vm.pages[0].name).toBe('Home')
    expect(vm.pages[6]).toMatchObject({ name: 'Other pages', path: '2 pages', views: '74' })
    expect(vm.referrers.map((r) => r.name)).toEqual(['Direct', 'linkedin.com', 'google.com', 'github.com', 'Other'])
    expect(vm.referrers[4].visits).toBe('22')
    expect(vm.refMatches).toBe(true)
    expect(vm.refTotal).toBe('688')
  })

  it('handles an empty month', () => {
    const vm = buildAnalytics({ ...SAMPLE, visits: 0, pageViews: 0, avgSecondsPerView: 0, daily: SAMPLE.daily.map((d) => ({ ...d, visits: 0 })), pages: [], referrers: [] })
    expect(vm.sub).toBe('28 Sep – 27 Oct 2026.')
    expect(vm.empty).toBe(true)
    expect(vm.kpis[3].caption).toBe('No post views yet')
    expect(vm.ticks[vm.ticks.length - 1].label).toBe('10')
  })

  it('stamps today and older times', () => {
    expect(stamp('2026-10-27T09:41:00', new Date(2026, 9, 27, 10))).toBe('Updated today, 09:41')
    expect(stamp('2026-10-20T09:41:00', new Date(2026, 9, 27, 10))).toBe('Updated 20 Oct 2026, 09:41')
  })

  it('H-23: counting note when the range starts before v2, and the measured-views caption', () => {
    const vm = buildAnalytics({ ...SAMPLE, trackingVersionSince: '2026-10-31', measuredViews: 1040 })
    expect(vm.countingNote).toBe('Counting changed on 31 Oct 2026: earlier figures over-counted visits and under-counted time.')
    expect(vm.kpis[2].caption).toBe('Based on 1,040 views with a measured time')
    expect(buildAnalytics({ ...SAMPLE, trackingVersionSince: '2026-09-01' }).countingNote).toBeNull()
    expect(buildAnalytics(SAMPLE).countingNote).toBeNull()
    expect(buildAnalytics(SAMPLE).kpis[2].caption).toBe('Weighted by views')
  })

  it('H-23: campaigns sorted by visits, empty when absent', () => {
    const vm = buildAnalytics({ ...SAMPLE, campaigns: [
      { source: 'newsletter', medium: 'email', campaign: null, visits: 4 },
      { source: 'linkedin', medium: 'social', campaign: 'launch', visits: 12 },
    ] })
    expect(vm.campaigns.map((c) => [c.name, c.detail, c.visits])).toEqual([['launch', 'linkedin · social', '12'], ['No campaign name', 'newsletter · email', '4']])
    expect(vm.campaigns[0].top).toBe(true)
    expect(buildAnalytics(SAMPLE).campaigns).toEqual([])
    expect(buildAnalytics({ ...SAMPLE, campaigns: [] }).campaigns).toEqual([])
  })
})
