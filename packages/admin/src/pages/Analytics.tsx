import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { buildAnalytics, stamp, type Summary } from '@/lib/analytics'
import { useQ } from '@/hooks/useQ'
import Icon from '@/components/ui/Icon'

export const ANALYTICS_KEY = ['analytics-summary', 30] as const

const fetchSummary = async (): Promise<Summary> => {
  const res = await api.get('/analytics/summary', { params: { days: 30 } })
  return res.data.data as Summary
}

const PAGE_GRID = 'minmax(0, 1fr) 90px 110px'

export default function Analytics() {
  const [q] = useQ()
  const { data, isLoading, isError, isFetching, refetch } = useQuery({ queryKey: ANALYTICS_KEY, queryFn: fetchSummary, retry: false })
  const [hover, setHover] = useState(-1)

  const head = (sub: string, stampText = '') => (
    <div className="ad-head">
      <div>
        <h1 className="ad-title">Analytics</h1>
        <p className="ad-sub">{sub || ' '}</p>
      </div>
      <div className="ad-acts" style={{ alignItems: 'center' }}>
        {stampText ? <span className="mute num" style={{ fontSize: 13 }}>{stampText}</span> : null}
        <button type="button" className="btn btn-line" onClick={() => refetch()} disabled={isFetching}>
          <Icon name="refresh" size={16} />
          {isFetching && !isLoading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>
    </div>
  )

  if (isError && !data) {
    return (
      <>
        {head('')}
        <div className="card card-pad" role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <p className="b">Couldn't load analytics.</p>
          <button type="button" className="btn btn-line" onClick={() => refetch()} disabled={isFetching}>Try again</button>
        </div>
      </>
    )
  }

  if (isLoading || !data) {
    return (
      <>
        {head('')}
        <div className="card kpis" style={{ ['--n' as string]: 4 }} aria-busy="true" aria-label="Loading">
          {[0, 1, 2, 3].map((k) => (
            <div key={k} className="kpi"><span className="skel" style={{ height: 14, width: '60%' }} /><span className="skel" style={{ height: 28, width: '40%', marginTop: 6 }} /></div>
          ))}
        </div>
        <section className="card"><div className="card-head"><h2 className="card-title">Visits per day</h2></div><div className="skel-block" style={{ padding: '8px 24px 20px' }}><span className="skel" style={{ height: 200 }} /></div></section>
      </>
    )
  }

  const vm = buildAnalytics(data, q)
  const h = hover >= 0 ? vm.bars[hover] : null

  return (
    <>
      {head(vm.sub, stamp(data.generatedAt))}

      <div className="card kpis" style={{ ['--n' as string]: 4 }}>
        {vm.kpis.map((k) => (
          <div key={k.label} className="kpi">
            <span className="kpi-l">{k.label}</span>
            <span className="kpi-v">{k.value}{k.unit ? <>{' '}<small>{k.unit}</small></> : null}</span>
            <span className="kpi-c">{k.caption}</span>
          </div>
        ))}
      </div>

      <section className="card" aria-labelledby="an-chart-h">
        <div className="card-head">
          <h2 id="an-chart-h" className="card-title">Visits per day</h2>
          <span className="num" style={{ fontSize: 13, color: h ? '#241b33' : '#615a6c' }} aria-live="polite" data-testid="readout">
            {h ? `${h.label}: ${h.visits} visits` : vm.peak ? `Peak ${vm.peak.visits} on ${vm.peak.label}` : ''}
          </span>
        </div>
        <div style={{ padding: '8px 24px 20px' }}>
          {vm.empty ? (
            <div className="empty-slot" style={{ minHeight: 200, justifyContent: 'center' }}>No visits in the last 30 days yet.</div>
          ) : (
            <>
              <div className="plot" role="img" aria-label={vm.chartLabel}>
                {vm.ticks.map((t) => (
                  <span key={t.label}>
                    <div className={'grid-l' + (t.base ? ' base' : '')} style={{ bottom: t.pos }} />
                    <span className="tick" style={{ bottom: t.pos, transform: 'translateY(50%)' }}>{t.label}</span>
                  </span>
                ))}
                <div className="bars">
                  {vm.bars.map((b, k) => (
                    <button
                      key={b.key}
                      type="button"
                      className={'bar' + (b.peak ? ' peak' : '')}
                      aria-label={b.aria}
                      onMouseEnter={() => setHover(k)}
                      onFocus={() => setHover(k)}
                      onMouseLeave={() => setHover(-1)}
                      onBlur={() => setHover(-1)}
                    >
                      <span style={{ height: b.h }} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="xl" aria-hidden="true">
                {vm.xlabels.map((x) => <span key={x.label} style={{ left: x.left }}>{x.label}</span>)}
              </div>
            </>
          )}
        </div>
      </section>

      <div className="rail">
        <section className="card" aria-labelledby="an-pages-h">
          <div className="card-head"><h2 id="an-pages-h" className="card-title">Pages</h2><span className="mute" style={{ fontSize: 13 }}>Last 30 days</span></div>
          <div className="lh" style={{ gridTemplateColumns: PAGE_GRID }}><span>Page</span><span className="right">Views</span><span className="right">Avg time</span></div>
          <ul className="rows">
            {vm.pages.map((p) => (
              <li key={p.path} className="row" style={{ gridTemplateColumns: PAGE_GRID, minHeight: 52 }}>
                <div style={{ minWidth: 0 }}><p className="r1" style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</p><p className="r2">{p.path}</p></div>
                <div className="right num" style={{ textAlign: 'right' }}><p>{p.views}</p><p className="mute" style={{ fontSize: 12 }}>{p.share}</p></div>
                <span className="right num">{p.time}</span>
              </li>
            ))}
          </ul>
          {vm.pages.length === 0 ? <p className="mute" style={{ padding: '12px 24px' }}>{q.trim() ? `No pages match “${q.trim()}”.` : 'No page views yet.'}</p> : null}
          <div className="viewall num mute" style={{ justifyContent: 'space-between', fontSize: 13 }}><span>{vm.pageCount} pages</span><span>{vm.viewTotal} views in total</span></div>
        </section>

        <section aria-labelledby="an-ref-h">
          <h2 id="an-ref-h" className="rail-h">Where visits come from</h2>
          <div className="card card-pad" style={{ paddingTop: 8, paddingBottom: 12 }}>
            {vm.referrers.length ? (
              <ul className="blist">
                {vm.referrers.map((r) => (
                  <li key={r.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontWeight: r.top ? 600 : 400 }}>{r.name}</span>
                      <span className="num">{r.visits} <span className="mute" style={{ fontSize: 12 }}>{r.share}</span></span>
                    </div>
                    <div className={'bl-bar' + (r.top ? ' top' : '')} style={{ width: r.w }} />
                  </li>
                ))}
              </ul>
            ) : <p className="mute" style={{ padding: '10px 0' }}>No visits yet.</p>}
            {vm.refMatches && vm.referrers.length ? <p className="mute num" style={{ fontSize: 12, marginTop: 8 }}>{vm.refTotal} visits in total, the same as the chart.</p> : null}
          </div>
        </section>
      </div>
    </>
  )
}
