import type { Summary } from '@/lib/analytics'

const VIS = [18, 22, 15, 12, 24, 27, 21, 19, 16, 14, 26, 29, 23, 20, 17, 61, 38, 25, 22, 19, 16, 21, 24, 18, 15, 27, 30, 26, 23, 20]
const daily = VIS.map((v, k) => {
  const d = new Date(Date.UTC(2026, 8, 28 + k))
  return { date: d.toISOString().slice(0, 10), visits: v }
})
export const SAMPLE: Summary = {
  range: { from: '2026-09-28', to: '2026-10-27', days: 30 },
  generatedAt: '2026-10-27T09:41:00',
  visits: 688,
  pageViews: 1162,
  avgSecondsPerView: 93,
  daily,
  pages: [
    { path: '/', title: null, views: 512, avgSeconds: 48 },
    { path: '/blog/automatic-updates-desktop-app', title: 'Automatic updates', views: 186, avgSeconds: 214 },
    { path: '/projects', title: null, views: 141, avgSeconds: 71 },
    { path: '/experience', title: null, views: 97, avgSeconds: 63 },
    { path: '/about', title: null, views: 88, avgSeconds: 55 },
    { path: '/blog/micro-frontends-serverless-backends', title: 'Micro-frontends and serverless post', views: 64, avgSeconds: 302 },
    { path: '/learning', title: null, views: 40, avgSeconds: 40 },
    { path: '/blog', title: null, views: 34, avgSeconds: 40 },
  ],
  referrers: [{ source: 'Direct', visits: 301 }, { source: 'linkedin.com', visits: 214 }, { source: 'google.com', visits: 118 }, { source: 'github.com', visits: 33 }, { source: 'x.com', visits: 12 }, { source: 'bing.com', visits: 10 }],
}

