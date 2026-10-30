import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useBlocker, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { fieldErrors, apiError } from '@/lib/errors'
import { fmtDay, fmtMon, isoDay } from '@/lib/format'
import { SITE_URL } from '@/lib/config'
import { CV_STATUS_KEY } from '@/lib/cv'
import { isOn, useFlags } from '@/lib/flags'
import { ABOUT_LIMITS as L, aboutPathToForm, newDetail, newPara, snapshot, toAboutBody, toAboutForm, validateAbout, type AboutApi, type AboutForm } from '@/lib/about'
import { RECS_KEY, fetchRecs, recLine, type Recommendation } from '@/lib/recommendations'
import { useQ } from '@/hooks/useQ'
import { useEditParam } from '@/hooks/useEditParam'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import LimitField from '@/components/ui/LimitField'
import Field from '@/components/ui/Field'
import RepeatList from '@/components/ui/RepeatList'
import Icon from '@/components/ui/Icon'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import RecommendationDialog from '@/components/RecommendationDialog'

export const ABOUT_KEY = ['about'] as const

const fetchAbout = async (): Promise<AboutApi> => (await api.get('/content/about')).data.data as AboutApi

const savedLabel = (iso?: string | null) => {
  if (!iso) return 'Not saved from the admin yet.'
  const d = new Date(iso)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `Last saved ${fmtDay(isoDay(d))}, ${hm}.`
}

function SetRow({ id, title, desc, extra, children }: { id: string; title: string; desc: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="set" aria-labelledby={id}>
      <div>
        <h2 id={id} className="set-t">{title}</h2>
        <p className="set-d">{desc}</p>
        {extra ? <div style={{ marginTop: 10 }}>{extra}</div> : null}
      </div>
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </section>
  )
}

const REC_GRID = 'minmax(0, 1fr) 120px 110px 132px 80px'

export default function About() {
  const qc = useQueryClient()
  const { say } = useToast()
  const [q] = useQ()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'recommendations' ? 'recs' : 'page'

  const about = useQuery({ queryKey: ABOUT_KEY, queryFn: fetchAbout, retry: false })
  const recs = useQuery({ queryKey: RECS_KEY, queryFn: fetchRecs })
  const { data: flags } = useFlags()
  const openToWork = isOn(flags, 'open_to_work')

  // ----- Page and CV form -----
  const [form, setForm] = useState<AboutForm | null>(null)
  const [base, setBase] = useState('')
  const [tried, setTried] = useState(false)
  const [serverErr, setServerErr] = useState<Record<string, string>>({})
  const itemIndex = useRef<number[]>([])
  const pageRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (about.data && !form) {
      const f = toAboutForm(about.data)
      setForm(f)
      setBase(snapshot(f))
    }
  }, [about.data, form])

  const dirty = !!form && snapshot(form) !== base
  const clientErr = useMemo(() => (form && tried ? validateAbout(form) : {}), [form, tried])
  const err = (path: string) => serverErr[path] || clientErr[path] || null
  const set = <K extends keyof AboutForm>(k: K, v: AboutForm[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f))
    setServerErr({})
  }

  const focusFirst = (paths: string[]) => {
    requestAnimationFrame(() => {
      for (const p of paths) {
        const el = pageRef.current?.querySelector<HTMLElement>(`[name="${p}"]`)
        if (el) {
          el.scrollIntoView?.({ block: 'center' })
          el.focus()
          return
        }
      }
    })
  }

  const save = useMutation({
    mutationFn: (f: AboutForm) => {
      const { body, itemIndex: idx } = toAboutBody(f)
      itemIndex.current = idx
      return api.put('/content/about', body)
    },
    onSuccess: (res) => {
      const saved = (res.data?.data || null) as AboutApi | null
      if (saved) qc.setQueryData(ABOUT_KEY, saved)
      const f = toAboutForm(saved || toAboutBody(form!).body)
      setForm(f)
      setBase(snapshot(f))
      setTried(false)
      qc.invalidateQueries({ queryKey: CV_STATUS_KEY })
      say('About saved. The CV rebuilds in a few seconds.')
    },
    onError: (e) => {
      const mapped: Record<string, string> = {}
      for (const [p, m] of Object.entries(fieldErrors(e))) {
        const fp = aboutPathToForm(p, itemIndex.current)
        if (fp) mapped[fp] = m
      }
      if (Object.keys(mapped).length) {
        setServerErr(mapped)
        focusFirst(Object.keys(mapped))
        say('Check the highlighted fields.')
      } else say(apiError(e))
    },
  })

  const submit = () => {
    if (!form) return
    setTried(true)
    const e = validateAbout(form)
    if (Object.keys(e).length) {
      focusFirst(Object.keys(e))
      say('Check the highlighted fields.')
      return
    }
    save.mutate(form)
  }

  // ----- Unsaved changes -----
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  const [pendingTab, setPendingTab] = useState<'page' | 'recs' | null>(null)
  useEffect(() => {
    if (!dirty) return
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [dirty])

  const goTab = (t: 'page' | 'recs') =>
    setParams((p) => {
      const n = new URLSearchParams(p)
      if (t === 'recs') n.set('tab', 'recommendations')
      else n.delete('tab')
      return n
    }, { replace: true })
  const askTab = (t: 'page' | 'recs') => {
    if (t === tab) return
    if (dirty && tab === 'page') setPendingTab(t)
    else goTab(t)
  }
  const discard = () => {
    if (about.data) {
      const f = toAboutForm(about.data)
      setForm(f)
      setBase(snapshot(f))
    }
    setServerErr({})
    setTried(false)
  }

  // ----- Recommendations -----
  const list = recs.data || []
  const [recEdit, setRecEdit] = useState<Recommendation | 'new' | null>(null)
  useEditParam(tab === 'recs' ? recs.data : undefined, (r) => setRecEdit(r))
  const nextSort = (list.length ? Math.max(...list.map((r) => r.sort_order || 0)) : 0) + 10

  const reorder = useMutation({
    mutationFn: async ({ items, i, j }: { items: Recommendation[]; i: number; j: number }) => {
      let orders = items.map((r) => r.sort_order || 0)
      if (new Set(orders).size !== orders.length) {
        // tied orders (all 0 after the migration): spread them first so a swap means something
        orders = items.map((_, k) => k * 10)
        for (let k = 0; k < items.length; k++) await api.put(`/recommendations/${items[k].id}`, { sort_order: orders[k] })
      }
      await api.put(`/recommendations/${items[i].id}`, { sort_order: orders[j] })
      await api.put(`/recommendations/${items[j].id}`, { sort_order: orders[i] })
    },
    onMutate: async ({ items, i, j }) => {
      await qc.cancelQueries({ queryKey: RECS_KEY })
      const prev = qc.getQueryData<Recommendation[]>(RECS_KEY)
      const next = items.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      qc.setQueryData(RECS_KEY, next)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(RECS_KEY, ctx.prev)
      say("Couldn't reorder. Try again.")
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: RECS_KEY })
      qc.invalidateQueries({ queryKey: CV_STATUS_KEY })
    },
  })
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= list.length) return
    reorder.mutate({ items: list, i, j })
  }
  const needle = q.trim().toLowerCase()
  const shownRecs = needle ? list.filter((r) => [r.quote, r.name, r.role, r.company].join(' ').toLowerCase().includes(needle)) : list

  const showingPill = (on: boolean, offText: string) => <span className={'pill ' + (on ? 'p-live' : 'p-off')}>{on ? 'Showing now' : offText}</span>

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">About</h1>
          <p className="ad-sub">The About page and the top of your CV. {about.data ? savedLabel(about.data.updated_at) : ''}</p>
        </div>
        {tab === 'page' ? (
          <button type="submit" form="about-form" className="btn btn-primary" disabled={!dirty || save.isPending}>
            {save.isPending ? <><span className="spin" aria-hidden="true" />Saving</> : 'Save changes'}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setRecEdit('new')}>
            <Icon name="plus" size={16} />
            Add recommendation
          </button>
        )}
      </div>

      <div className="tabs" role="tablist" aria-label="About">
        <button type="button" role="tab" id="ab-tab-p" aria-selected={tab === 'page'} aria-controls="ab-panel" onClick={() => askTab('page')}>Page and CV</button>
        <button type="button" role="tab" id="ab-tab-r" aria-selected={tab === 'recs'} aria-controls="ab-panel" aria-label={`Recommendations ${list.length}`} onClick={() => askTab('recs')}>Recommendations<span className="n">{list.length}</span></button>
      </div>

      <div id="ab-panel" role="tabpanel" aria-labelledby={tab === 'page' ? 'ab-tab-p' : 'ab-tab-r'}>
        {tab === 'page' ? (
          about.isError && !about.data ? (
            <div className="notice" role="alert">
              Couldn't load the About content.
              <button type="button" className="btn btn-line" onClick={() => about.refetch()} style={{ marginLeft: 'auto', minHeight: 36 }}>Try again</button>
            </div>
          ) : !form ? (
            <div aria-busy="true" aria-label="Loading" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {[0, 1, 2].map((k) => <span key={k} className="skel" style={{ height: 160 }} />)}
            </div>
          ) : (
            <form id="about-form" ref={pageRef} noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
              <SetRow id="ab-intro" title="About text" desc="The paragraphs at the top of the About page. Markdown works.">
                <RepeatList kind="Paragraph" addLabel="Add a paragraph" items={form.intro} onChange={(v) => set('intro', v)} make={newPara} min={1} max={L.paras} hasText={(p) => !!p.text.trim()}>
                  {(p, i, up) => (
                    <LimitField label={`Paragraph ${i + 1}`} name={`intro.${i}`} multiline rows={5} max={L.para} value={p.text} onChange={(x) => up({ text: x })} error={err(`intro.${i}`)} />
                  )}
                </RepeatList>
              </SetRow>

              <SetRow id="ab-look" title="What I'm looking for" desc="Shows on About only while the Open to work badge is on." extra={showingPill(openToWork, 'Hidden now. Open to work is off.')}>
                <LimitField label="Summary" name="summary" multiline rows={3} max={L.summary} value={form.summary} onChange={(x) => set('summary', x)} error={err('summary')} />
                <RepeatList kind="Detail" items={form.items} onChange={(v) => set('items', v)} make={newDetail} max={L.items} hasText={(d) => !!(d.label.trim() || d.value.trim())}>
                  {(d, i, up) => (
                    <div className="form">
                      <LimitField label="Label" name={`items.${i}.label`} placeholder="Role" max={L.label} value={d.label} onChange={(x) => up({ label: x })} error={err(`items.${i}.label`)} />
                      <LimitField label="Value" name={`items.${i}.value`} placeholder="Full-stack or frontend" max={L.value} value={d.value} onChange={(x) => up({ value: x })} error={err(`items.${i}.value`)} />
                    </div>
                  )}
                </RepeatList>
              </SetRow>

              <SetRow id="ab-off" title="When you're not looking" desc="Shows on About in place of the section above while Open to work is off." extra={showingPill(!openToWork, 'Hidden now')}>
                <LimitField label="Line" name="offLine" max={L.offLine} value={form.offLine} onChange={(x) => set('offLine', x)} error={err('offLine')} />
              </SetRow>

              <SetRow id="ab-cv" title="CV profile" desc="The headline and profile at the top of your CV. Saving rebuilds the CV PDF.">
                <LimitField label="Headline" name="headline" max={L.headline} value={form.headline} onChange={(x) => set('headline', x)} error={err('headline')} />
                <LimitField label="Profile" name="profile" multiline rows={5} max={L.profile} value={form.profile} onChange={(x) => set('profile', x)} error={err('profile')} />
                <LimitField label="How you work with AI" name="ai" multiline rows={3} max={L.ai} value={form.ai} onChange={(x) => set('ai', x)} error={err('ai')} hint="Optional. Its own short paragraph on the CV." />
                <div className="pfoot" style={{ marginTop: 0, justifyContent: 'flex-start' }}>
                  <a className="btn btn-text" href={`${SITE_URL}/cv`} target="_blank" rel="noopener noreferrer">Preview the CV</a>
                  <a className="btn btn-text" href={`${SITE_URL}/about`} target="_blank" rel="noopener noreferrer">Open the About page</a>
                </div>
              </SetRow>

              <SetRow id="ab-contact" title="Contact details" desc="Used on the CV and the About page. No phone number is stored.">
                <Field label="Email" error={err('email')}>{(p) => <input {...p} name="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />}</Field>
                <Field label="LinkedIn URL" error={err('linkedin')}>{(p) => <input {...p} name="linkedin" type="url" placeholder="https://" value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} />}</Field>
                <Field label="GitHub URL" error={err('github')}>{(p) => <input {...p} name="github" type="url" placeholder="https://" value={form.github} onChange={(e) => set('github', e.target.value)} />}</Field>
                <Field label="Portfolio URL" error={err('portfolio')}>{(p) => <input {...p} name="portfolio" type="url" placeholder="https://" value={form.portfolio} onChange={(e) => set('portfolio', e.target.value)} />}</Field>
                <LimitField label="Location" name="location" max={L.location} value={form.location} onChange={(x) => set('location', x)} error={err('location')} />
              </SetRow>
            </form>
          )
        ) : (
          <section className="card" aria-label="Recommendations">
            <div className="card-head">
              <h2 className="card-title">Recommendations <span className="mute num" style={{ fontWeight: 400 }}>{list.length}</span></h2>
              <span className="mute" style={{ fontSize: 13 }}>The CV shows the first one marked On the CV.</span>
            </div>
            <div className="lh" style={{ gridTemplateColumns: REC_GRID }}>
              <span>Recommendation</span><span className="hide-sm">CV</span><span className="hide-sm">Date</span><span className="sr">Order</span><span className="sr">Actions</span>
            </div>
            {recs.isLoading ? <SkeletonRows thumb={false} /> : (
              <ul className="rows">
                {shownRecs.map((r) => {
                  const i = list.indexOf(r)
                  return (
                    <li key={r.id} className="row" style={{ gridTemplateColumns: REC_GRID }}>
                      <div style={{ minWidth: 0 }}>
                        <p className="r1">“{r.quote}”</p>
                        <p className="r2">{recLine(r)}</p>
                      </div>
                      <span className="hide-sm">{r.show_on_cv ? <span className="pill p-hue">On the CV</span> : null}</span>
                      <span className="hide-sm num mute" style={{ fontSize: 13 }}>{r.date ? fmtMon(r.date) : '—'}</span>
                      <span style={{ display: 'flex' }}>
                        <button type="button" className="iconbtn" aria-label={`Move ${r.name} up`} disabled={i <= 0 || reorder.isPending} onClick={() => move(i, -1)}><Icon name="up" /></button>
                        <button type="button" className="iconbtn" aria-label={`Move ${r.name} down`} disabled={i >= list.length - 1 || reorder.isPending} onClick={() => move(i, 1)}><Icon name="down" /></button>
                      </span>
                      <button type="button" className="btn btn-text right" onClick={() => setRecEdit(r)} aria-label={`Edit recommendation from ${r.name}`}>Edit</button>
                    </li>
                  )
                })}
              </ul>
            )}
            {!recs.isLoading && shownRecs.length === 0 ? (
              <div style={{ padding: '0 24px 20px' }}>
                <div className="empty-slot">
                  <span>{needle ? `No recommendations match “${q.trim()}”.` : 'No recommendations yet. Add one and it shows under Kind words on About.'}</span>
                  <button type="button" className="btn btn-text" onClick={() => setRecEdit('new')}>Add one</button>
                </div>
              </div>
            ) : null}
          </section>
        )}
      </div>

      {recEdit ? <RecommendationDialog rec={recEdit === 'new' ? null : recEdit} nextSortOrder={nextSort} onClose={() => setRecEdit(null)} /> : null}

      {blocker.state === 'blocked' || pendingTab ? (
        <ConfirmDialog
          title="Leave without saving?"
          description="Your changes to the About page will be lost."
          cancelLabel="Keep editing"
          confirmLabel="Leave"
          onCancel={() => {
            if (blocker.state === 'blocked') blocker.reset()
            setPendingTab(null)
          }}
          onConfirm={() => {
            if (blocker.state === 'blocked') blocker.proceed()
            if (pendingTab) {
              discard()
              goTab(pendingTab)
              setPendingTab(null)
            }
          }}
        />
      ) : null}
    </>
  )
}
