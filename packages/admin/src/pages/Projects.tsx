import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { apiError, fieldErrors } from '@/lib/errors'
import { commas, dayOf, lines, plural, slugify } from '@/lib/format'
import { PROJECTS_KEY, fetchProject, fetchProjects, isPublic, type Project, type ProjectStatus } from '@/lib/projects'
import { CV_STATUS_KEY } from '@/lib/cv'
import { emptyCase, fromCaseForm, serverPathToForm, toCaseForm, validateCase, type CaseForm, type IndexMap } from '@/lib/caseStudy'
import { useQ } from '@/hooks/useQ'
import { useEditParam } from '@/hooks/useEditParam'
import Dialog, { SaveButton } from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Field from '@/components/ui/Field'
import Switch from '@/components/ui/Switch'
import Segmented from '@/components/ui/Segmented'
import Icon from '@/components/ui/Icon'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { ImageUploadButton } from '@/components/ImageUploadButton'
import CaseStudyEditor from '@/components/project/CaseStudyEditor'
import ShareLinkedInDialog, { ShareButton } from '@/components/ShareLinkedIn'
import type { ShareItem } from '@/lib/share'

const STATUS: Record<ProjectStatus, [string, string]> = {
  in_development: ['In development', 'p-hue'],
  ideas: ['Idea', 'p-off'],
  completed: ['Completed', 'p-live'],
}

type Draft = {
  title: string; slug: string; description: string; status: ProjectStatus; image: string; gallery: string; inspiration: string
  techText: string; github: string; live: string; date: string; role: string; platform: string; featured: boolean; showOnSite: boolean; content: string
}

const newDraft = (): Draft => ({ title: '', slug: '', description: '', status: 'ideas', image: '', gallery: '', inspiration: '', techText: '', github: '', live: '', date: '', role: '', platform: '', featured: false, showOnSite: true, content: '' })

const toDraft = (p: Project): Draft => ({
  title: p.title || '', slug: p.slug || '', description: p.description || '', status: p.status || 'ideas', image: p.image || '', gallery: p.images.join('\n'),
  inspiration: p.inspiration || '', techText: p.technologies.join(', '), github: p.github_url || '', live: p.live_url || '', date: dayOf(p.date),
  role: p.role || '', platform: p.platform || '', featured: p.featured, showOnSite: p.show_on_site !== false, content: p.content || '',
})

export const toProjectBody = (d: Draft, caseStudy: object | null) => ({
  title: d.title.trim(),
  slug: d.slug.trim() || slugify(d.title),
  description: d.description.trim(),
  status: d.status,
  image: d.image.trim(),
  images: lines(d.gallery),
  inspiration: d.inspiration.trim(),
  technologies: commas(d.techText),
  github_url: d.github.trim(),
  live_url: d.live.trim(),
  date: d.date || null,
  role: d.role.trim() || null,
  platform: d.platform.trim() || null,
  featured: d.featured,
  show_on_site: d.showOnSite,
  content: d.content,
  case_study: caseStudy,
})

const PATH: Record<string, keyof Draft> = { title: 'title', slug: 'slug', description: 'description', status: 'status', image: 'image', images: 'gallery', inspiration: 'inspiration', technologies: 'techText', github_url: 'github', live_url: 'live', date: 'date', role: 'role', platform: 'platform' }

type Filter = 'all' | ProjectStatus
const GRID = 'minmax(0, 1fr) 140px minmax(0, 300px) 100px auto'

export default function Projects() {
  const qc = useQueryClient()
  const { say } = useToast()
  const [q, setQ] = useQ()
  const [filter, setFilter] = useState<Filter>('all')
  const { data: projects, isLoading } = useQuery({ queryKey: PROJECTS_KEY, queryFn: fetchProjects })

  const [editId, setEditId] = useState<number | 'new' | null>(null)
  const [d, setD] = useState<Draft>(newDraft)
  const [cs, setCs] = useState<CaseForm>(emptyCase)
  const [hadCase, setHadCase] = useState(false)
  const [legacy, setLegacy] = useState(false)
  const [tab, setTab] = useState<'details' | 'case'>('details')
  const [tried, setTried] = useState(false)
  const [serverErr, setServerErr] = useState<Record<string, string>>({})
  const [caseServerErr, setCaseServerErr] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)
  const [opening, setOpening] = useState<number | null>(null)
  const [sharing, setSharing] = useState<ShareItem | null>(null)

  const reset = () => {
    setTab('details')
    setTried(false)
    setServerErr({})
    setCaseServerErr({})
    setConfirming(false)
  }

  const open = async (p: Project | null) => {
    if (!p) {
      setEditId('new')
      setD(newDraft())
      setCs(emptyCase())
      setHadCase(false)
      setLegacy(false)
      reset()
      return
    }
    setOpening(p.id)
    try {
      // H-19: the editor reads the full record (case_study, content) from the admin endpoint.
      const full = await qc.fetchQuery({ queryKey: ['project', p.id], queryFn: () => fetchProject(p.id), staleTime: 0 })
      setEditId(p.id)
      setD(toDraft(full))
      setCs(toCaseForm(full.case_study))
      setHadCase(!!full.case_study || !!p.has_case_study)
      setLegacy(!!(full.content || '').trim())
      reset()
    } catch (e) {
      say(apiError(e, "Couldn't open the project. Try again."))
    } finally {
      setOpening(null)
    }
  }
  const close = () => setEditId(null)
  useEditParam(projects, open)

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((p) => {
      const next = { ...p, [k]: v }
      if (k === 'title' && editId === 'new') next.slug = slugify(String(v))
      return next
    })
    setServerErr((e) => ({ ...e, [k]: '' }))
  }
  const setCase = (v: CaseForm) => {
    setCs(v)
    setCaseServerErr({})
  }

  const detailErr = (k: keyof Draft) => (tried && k === 'title' && !d.title.trim() ? 'Give the project a title.' : serverErr[k] || null)
  const caseClientErr = validateCase(cs)
  const caseErrors = { ...(tried ? caseClientErr : {}), ...caseServerErr }
  const detailErrCount = (tried && !d.title.trim() ? 1 : 0) + Object.values(serverErr).filter(Boolean).length
  const caseErrCount = Object.keys(caseErrors).length

  const indexMap = useRef<IndexMap | null>(null)
  const save = useMutation({
    mutationFn: async () => {
      const { value, index } = fromCaseForm(cs)
      indexMap.current = index
      const body = toProjectBody(d, value)
      return editId === 'new' ? api.post('/projects', body) : api.put(`/projects/${editId}`, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY })
      qc.invalidateQueries({ queryKey: CV_STATUS_KEY })
      if (typeof editId === 'number') qc.removeQueries({ queryKey: ['project', editId] })
      close()
      say(`Saved ${d.title.trim()}`)
    },
    onError: (e) => {
      const fe = fieldErrors(e)
      const det: Record<string, string> = {}
      const cse: Record<string, string> = {}
      for (const [p, m] of Object.entries(fe)) {
        if (p.startsWith('case_study')) {
          const fp = indexMap.current ? serverPathToForm(p, indexMap.current) : null
          if (fp) cse[fp] = m
        } else if (PATH[p]) det[PATH[p]] = m
      }
      if (Object.keys(det).length || Object.keys(cse).length) {
        setServerErr(det)
        setCaseServerErr(cse)
        setTab(Object.keys(det).length ? 'details' : 'case')
      } else say(apiError(e))
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY })
      qc.invalidateQueries({ queryKey: CV_STATUS_KEY })
      setConfirming(false)
      close()
      say(`Deleted ${d.title}`)
    },
    onError: (e) => {
      setConfirming(false)
      say(apiError(e, "Couldn't delete. Try again."))
    },
  })

  const submit = () => {
    setTried(true)
    const detailsBad = !d.title.trim()
    const caseBad = Object.keys(validateCase(cs)).length > 0
    if (detailsBad || caseBad) {
      setTab(detailsBad ? 'details' : 'case')
      return
    }
    save.mutate()
  }

  const all = projects || []
  const needle = q.trim().toLowerCase()
  const inQ = all.filter((p) => !needle || p.title.toLowerCase().includes(needle) || p.technologies.some((t) => t.toLowerCase().includes(needle)))
  const shown = inQ.filter((p) => filter === 'all' || p.status === filter)
  const featuredCount = all.filter((p) => p.featured).length
  const otherFeatured = all.find((p) => p.featured && p.id !== editId)
  const techList = commas(d.techText)
  const caseEmpty = editId === 'new' ? !fromCaseForm(cs).value : !hadCase && !fromCaseForm(cs).value

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Projects</h1>
          <p className="ad-sub">{projects ? `${plural(all.length, 'project', 'projects')}, ${featuredCount} featured on the home page.` : ' '}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => open(null)}>
          <Icon name="plus" size={16} />
          New project
        </button>
      </div>

      <div className="toolbar">
        <div className="search">
          <label className="sr" htmlFor="pj-q">Search projects</label>
          <Icon name="search" size={16} />
          <input id="pj-q" className="input" type="search" placeholder="Title or technology" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Segmented
          aria-label="Filter by status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: inQ.length },
            { value: 'in_development', label: 'In development', count: inQ.filter((p) => p.status === 'in_development').length },
            { value: 'ideas', label: 'Ideas', count: inQ.filter((p) => p.status === 'ideas').length },
            { value: 'completed', label: 'Completed', count: inQ.filter((p) => p.status === 'completed').length },
          ]}
        />
      </div>

      <section className="card" aria-label="Project list">
        <div className="lh" style={{ gridTemplateColumns: GRID }}>
          <span>Project</span><span>Status</span><span className="hide-sm">Technologies</span><span>Home page</span><span className="sr">Actions</span>
        </div>
        {isLoading ? <SkeletonRows /> : (
          <ul className="rows">
            {shown.map((p) => {
              const [label, cls] = STATUS[p.status || 'ideas']
              return (
                <li key={p.id} className="row" style={{ gridTemplateColumns: GRID }}>
                  <div className="cell-id">
                    <img className="thumb" src={p.image || '/logo.svg'} alt="" width={800} height={427} loading="lazy" style={p.image ? undefined : { objectFit: 'contain' }} />
                    <div>
                      <p className="r1">{p.title}</p>
                      <p className="r2">/projects/{p.slug}{isPublic(p) ? '' : ' · not on the site'}</p>
                    </div>
                  </div>
                  <span className="hide-sm"><span className={`pill ${cls}`}><span className="dot" />{label}</span></span>
                  <div className="chips hide-sm" style={{ flexWrap: 'nowrap', overflow: 'hidden' }}>
                    {p.technologies.slice(0, 3).map((t) => <span key={t} className="chip">{t}</span>)}
                    {p.technologies.length > 3 ? <span className="mute" style={{ fontSize: 12, alignSelf: 'center', whiteSpace: 'nowrap' }}>+{p.technologies.length - 3}</span> : null}
                  </div>
                  <span className="hide-sm" style={{ fontSize: 13, color: p.featured ? '#4c1d95' : '#615a6c' }}>{p.featured ? 'Featured' : '—'}</span>
                  <div className="right" style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {isPublic(p) && p.slug ? (
                      <ShareButton title={p.title} onClick={() => setSharing({ kind: 'project', title: p.title, slug: p.slug!, summary: p.description || '', tags: p.technologies, image: p.image || null })} />
                    ) : null}
                    <button type="button" className="btn btn-text" onClick={() => open(p)} disabled={opening === p.id} aria-label={`Edit ${p.title}`}>Edit</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {!isLoading && shown.length === 0 ? (
          <div style={{ padding: '0 24px 20px' }}>
            <div className="empty-slot">
              <span>{needle ? `No projects match “${q.trim()}”.` : all.length ? 'No projects with this status.' : 'No projects yet.'}</span>
              <button type="button" className="btn btn-text" onClick={() => { setQ(''); setFilter('all') }}>Clear filters</button>
            </div>
          </div>
        ) : null}
      </section>

      {editId !== null ? (
        <Dialog
          title={editId === 'new' ? 'New project' : `Edit ${d.title || 'project'}`}
          sub={editId === 'new' ? 'Saved projects show on the Projects page straight away.' : 'Changes show on the site when you save.'}
          size="wide"
          onClose={close}
          saving={save.isPending}
          onSubmit={submit}
          footer={
            <>
              {editId !== 'new' ? <button type="button" className="btn btn-neg first" onClick={() => setConfirming(true)}>Delete project</button> : null}
              <button type="button" className="btn btn-line" onClick={close} disabled={save.isPending}>Cancel</button>
              <SaveButton saving={save.isPending} label={editId === 'new' ? 'Create project' : 'Save changes'} />
            </>
          }
        >
          <div className="tabs" role="tablist" aria-label="Project" style={{ marginTop: -8, marginBottom: 20 }}>
            <button type="button" role="tab" id="pj-tab-d" aria-selected={tab === 'details'} aria-controls="pj-panel" aria-label={detailErrCount ? `Details, ${detailErrCount} ${detailErrCount === 1 ? 'error' : 'errors'}` : 'Details'} onClick={() => setTab('details')}>
              Details{detailErrCount ? <span className="n" style={{ color: '#b4235a', fontWeight: 600 }}>{detailErrCount}</span> : null}
            </button>
            <button type="button" role="tab" id="pj-tab-c" aria-selected={tab === 'case'} aria-controls="pj-panel" aria-label={caseErrCount ? `Case study, ${caseErrCount} ${caseErrCount === 1 ? 'error' : 'errors'}` : caseEmpty ? 'Case study, empty' : 'Case study'} onClick={() => setTab('case')}>
              Case study
              {caseErrCount ? <span className="n" style={{ color: '#b4235a', fontWeight: 600 }}>{caseErrCount}</span> : caseEmpty ? <span className="n">empty</span> : null}
            </button>
          </div>
          <div id="pj-panel" role="tabpanel" aria-labelledby={tab === 'details' ? 'pj-tab-d' : 'pj-tab-c'}>
            {tab === 'details' ? (
              <div className="form">
                <Field label="Title" error={detailErr('title')}>{(p) => <input {...p} value={d.title} onChange={(e) => set('title', e.target.value)} />}</Field>
                <Field label="URL slug" error={detailErr('slug')} hint={`demitaylornimmo.com/projects/${d.slug}`}>{(p) => <input {...p} value={d.slug} onChange={(e) => set('slug', e.target.value)} />}</Field>
                <Field label="Description" span2 error={detailErr('description')} hint="The line under the title on the Projects page.">{(p) => <textarea {...p} rows={3} value={d.description} onChange={(e) => set('description', e.target.value)} />}</Field>
                <div className="field span2">
                  <span id="pj-status-l">Status</span>
                  <Segmented aria-labelledby="pj-status-l" style={{ alignSelf: 'flex-start' }} value={d.status} onChange={(v) => set('status', v)}
                    options={[{ value: 'in_development', label: 'In development' }, { value: 'ideas', label: 'Idea' }, { value: 'completed', label: 'Completed' }]} />
                </div>
                <Field label="Card image" span2 error={detailErr('image')} hint="The thumbnail on the Projects page and in link previews.">
                  {(p) => (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <img className="thumb" src={d.image || '/logo.svg'} alt="" width={800} height={427} style={{ width: 88, height: 60, objectFit: d.image ? 'cover' : 'contain' }} />
                      <div className="joined" style={{ flex: 1, minWidth: 0 }}>
                        <input {...p} placeholder="https://" value={d.image} onChange={(e) => set('image', e.target.value)} />
                        <ImageUploadButton onUploaded={(url) => set('image', url)} />
                      </div>
                    </div>
                  )}
                </Field>
                <Field label="Gallery images" span2 error={detailErr('gallery')} hint="Shown on the project's case study page, in this order.">{(p) => <textarea {...p} rows={2} placeholder="One image URL per line" value={d.gallery} onChange={(e) => set('gallery', e.target.value)} />}</Field>
                <Field label="Inspiration" span2 error={detailErr('inspiration')} hint="Optional. The problem it solves, the story behind it.">{(p) => <textarea {...p} rows={3} value={d.inspiration} onChange={(e) => set('inspiration', e.target.value)} />}</Field>
                <Field label="Technologies" span2 error={detailErr('techText')} hint="Separate with commas."
                  after={<span className="chips" aria-hidden="true">{techList.map((t) => <span key={t} className="chip">{t}</span>)}</span>}>
                  {(p) => <input {...p} value={d.techText} onChange={(e) => set('techText', e.target.value)} />}
                </Field>
                <Field label="Your role" error={detailErr('role')} hint="Shown in the case study header.">{(p) => <input {...p} maxLength={120} value={d.role} onChange={(e) => set('role', e.target.value)} />}</Field>
                <Field label="Platform" error={detailErr('platform')} hint="Shown in the case study header.">{(p) => <input {...p} maxLength={120} value={d.platform} onChange={(e) => set('platform', e.target.value)} />}</Field>
                <Field label="GitHub URL" error={detailErr('github')}>{(p) => <input {...p} type="url" placeholder="https://github.com/" value={d.github} onChange={(e) => set('github', e.target.value)} />}</Field>
                <Field label="Live URL" error={detailErr('live')}>{(p) => <input {...p} type="url" placeholder="https://" value={d.live} onChange={(e) => set('live', e.target.value)} />}</Field>
                <Field label="Project date" error={detailErr('date')}>{(p) => <input {...p} type="date" value={d.date} onChange={(e) => set('date', e.target.value)} />}</Field>
                <span />
                <div className="field" style={{ justifyContent: 'flex-end' }}>
                  <Switch checked={d.showOnSite} onChange={(v) => set('showOnSite', v)}>
                    <span>
                      <span style={{ display: 'block', fontWeight: 500 }}>Show on site</span>
                      <span className="hint">{d.status === 'ideas' ? 'Ideas never show on the site, even with this on.' : 'Lists it on the Projects page, the home page and the CV.'}</span>
                    </span>
                  </Switch>
                </div>
                <div className="field" style={{ justifyContent: 'flex-end' }}>
                  <Switch checked={d.featured} onChange={(v) => set('featured', v)}>
                    <span>
                      <span style={{ display: 'block', fontWeight: 500 }}>Feature on the home page</span>
                      <span className="hint">{otherFeatured ? `Replaces ${otherFeatured.title} in the home page spotlight.` : 'The spotlight project on the home page.'}</span>
                    </span>
                  </Switch>
                </div>
              </div>
            ) : (
              <CaseStudyEditor value={cs} onChange={setCase} errors={caseErrors} legacy={legacy ? { content: d.content, onChange: (v) => set('content', v) } : null} />
            )}
          </div>
        </Dialog>
      ) : null}

      {sharing ? <ShareLinkedInDialog item={sharing} onClose={() => setSharing(null)} /> : null}

      {confirming && typeof editId === 'number' ? (
        <ConfirmDialog
          title={`Delete ${d.title}?`}
          description="It disappears from the Projects page, the home page and the CV. This can't be undone."
          confirmLabel="Delete project"
          busy={remove.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => remove.mutate(editId)}
        />
      ) : null}
    </>
  )
}
