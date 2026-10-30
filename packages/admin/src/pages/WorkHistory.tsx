import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { apiError, fieldErrors } from '@/lib/errors'
import { commas, duration, isoMonth, lines, monthOf, monthRange, monthToApi, monthsInclusive, plural, toArray } from '@/lib/format'
import { useQ } from '@/hooks/useQ'
import { useEditParam } from '@/hooks/useEditParam'
import Dialog, { SaveButton } from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Field from '@/components/ui/Field'
import Switch from '@/components/ui/Switch'
import Icon from '@/components/ui/Icon'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

export interface Role {
  id: number
  company: string
  position: string
  location?: string | null
  start_date: string
  end_date?: string | null
  description?: string | null
  achievements: string[]
  highlights: string[]
  technologies: string[]
  company_url?: string | null
}

type Draft = {
  position: string
  company: string
  location: string
  url: string
  start: string
  end: string
  current: boolean
  description: string
  achievements: string
  highlights: string
  techText: string
}

const EMPTY: Draft = { position: '', company: '', location: '', url: '', start: '', end: '', current: false, description: '', achievements: '', highlights: '', techText: '' }

export const WORK_KEY = ['work-history'] as const

export const fetchRoles = async (): Promise<Role[]> => {
  const res = await api.get('/work-history')
  return ((res.data?.data || []) as Role[]).map((r) => ({
    ...r,
    achievements: toArray(r.achievements),
    highlights: toArray(r.highlights),
    technologies: toArray(r.technologies),
  }))
}

/** Current roles first, then newest start first. */
export const sortRoles = (roles: Role[]) =>
  roles.slice().sort((a, b) => {
    const ca = !a.end_date
    const cb = !b.end_date
    if (ca !== cb) return ca ? -1 : 1
    return a.start_date < b.start_date ? 1 : a.start_date > b.start_date ? -1 : 0
  })

export const initials = (company: string) => (company.match(/\d+[A-Z]|[A-Z]/g) || ['?']).slice(0, 2).join('')

/** Client rule for Impact highlights (H-11): at most 6 lines of 1–60 characters. */
export const highlightsError = (text: string) => {
  const items = lines(text)
  if (items.length > 6) return 'Up to 6 highlights.'
  if (items.some((h) => h.length > 60)) return 'Keep each highlight to 60 characters.'
  return null
}

const toDraft = (r: Role): Draft => ({
  position: r.position || '',
  company: r.company || '',
  location: r.location || '',
  url: r.company_url || '',
  start: monthOf(r.start_date),
  end: monthOf(r.end_date),
  current: !r.end_date,
  description: r.description || '',
  achievements: r.achievements.join('\n'),
  highlights: r.highlights.join('\n'),
  techText: r.technologies.join(', '),
})

const toBody = (d: Draft) => ({
  position: d.position.trim(),
  company: d.company.trim(),
  location: d.location.trim(),
  company_url: d.url.trim() || null,
  start_date: monthToApi(d.start),
  end_date: d.current ? null : monthToApi(d.end),
  description: d.description.trim(),
  achievements: lines(d.achievements),
  highlights: lines(d.highlights),
  technologies: commas(d.techText),
})

const roleBody = (r: Role) => ({
  position: r.position,
  company: r.company,
  location: r.location || '',
  company_url: r.company_url || null,
  start_date: r.start_date,
  end_date: r.end_date || null,
  description: r.description || '',
  achievements: r.achievements,
  highlights: r.highlights,
  technologies: r.technologies,
})

// Server `details[].path` -> draft field
const PATH: Record<string, keyof Draft> = { position: 'position', company: 'company', location: 'location', company_url: 'url', start_date: 'start', end_date: 'end', description: 'description', achievements: 'achievements', highlights: 'highlights', technologies: 'techText' }

const GRID = 'minmax(0, 1fr) minmax(0, 280px) 170px 80px'

export default function WorkHistory() {
  const qc = useQueryClient()
  const { say } = useToast()
  const [q] = useQ()
  const { data: roles, isLoading } = useQuery({ queryKey: WORK_KEY, queryFn: fetchRoles })

  const [editId, setEditId] = useState<number | 'new' | null>(null)
  const [d, setD] = useState<Draft>(EMPTY)
  const [tried, setTried] = useState(false)
  const [serverErr, setServerErr] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)

  const open = (r: Role | null) => {
    setEditId(r ? r.id : 'new')
    setD(r ? toDraft(r) : EMPTY)
    setTried(false)
    setServerErr({})
    setConfirming(false)
  }
  const close = () => setEditId(null)
  useEditParam(roles, open)

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((p) => ({ ...p, [k]: v }))
    setServerErr((e) => ({ ...e, [k]: '' }))
  }

  const clientErr: Partial<Record<keyof Draft, string>> = tried
    ? {
        position: d.position.trim() ? undefined : 'Add the job title.',
        company: d.company.trim() ? undefined : 'Add the company.',
        start: d.start ? undefined : 'Add the start month.',
      }
    : {}
  const hlErr = highlightsError(d.highlights)
  const err = (k: keyof Draft) => clientErr[k] || serverErr[k] || (k === 'highlights' && tried ? hlErr : null) || null

  const save = useMutation({
    mutationFn: async (draft: Draft) => {
      const body = toBody(draft)
      const res = editId === 'new' ? await api.post('/work-history', body) : await api.put(`/work-history/${editId}`, body)
      const savedId: number | undefined = res.data?.data?.id ?? (editId === 'new' ? undefined : (editId as number))
      // A new current role ends the previous current one at the start of this month (owner default Q3).
      if (draft.current) {
        const others = (roles || []).filter((r) => !r.end_date && r.id !== savedId && r.id !== editId)
        const end = monthToApi(isoMonth(new Date()))
        for (const r of others) await api.put(`/work-history/${r.id}`, { ...roleBody(r), end_date: end })
      }
      return draft
    },
    onSuccess: (draft) => {
      qc.invalidateQueries({ queryKey: WORK_KEY })
      close()
      say(`Saved ${draft.position.trim()} at ${draft.company.trim()}`)
    },
    onError: (e) => {
      const fe = fieldErrors(e)
      const mapped: Record<string, string> = {}
      for (const [p, m] of Object.entries(fe)) if (PATH[p]) mapped[PATH[p]] = m
      if (Object.keys(mapped).length) setServerErr(mapped)
      else say(apiError(e))
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/work-history/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORK_KEY })
      setConfirming(false)
      close()
      say('Role deleted')
    },
    onError: (e) => {
      setConfirming(false)
      say(apiError(e, "Couldn't delete. Try again."))
    },
  })

  const submit = () => {
    setTried(true)
    if (!d.position.trim() || !d.company.trim() || !d.start || highlightsError(d.highlights)) return
    save.mutate(d)
  }

  const sorted = useMemo(() => sortRoles(roles || []), [roles])
  const needle = q.trim().toLowerCase()
  const shown = needle
    ? sorted.filter((r) => [r.position, r.company, r.location || '', ...r.technologies].join(' ').toLowerCase().includes(needle))
    : sorted
  const companies = new Set((roles || []).map((r) => r.company)).size
  const nowMonth = isoMonth(new Date())

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Work history</h1>
          <p className="ad-sub">
            {roles ? `${plural(roles.length, 'role', 'roles')} at ${plural(companies, 'company', 'companies')}, newest first. Shown on Experience and the CV.` : ' '}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => open(null)}>
          <Icon name="plus" size={16} />
          Add a role
        </button>
      </div>

      <section className="card" aria-label="Roles, newest first">
        <div className="lh" style={{ gridTemplateColumns: GRID }}>
          <span>Role</span>
          <span className="hide-sm">Technologies</span>
          <span className="right">Dates</span>
          <span className="sr">Actions</span>
        </div>
        {isLoading ? (
          <SkeletonRows />
        ) : (
          <ul className="rows">
            {shown.map((r) => {
              const n = r.achievements.length
              return (
                <li key={r.id} className="row" style={{ gridTemplateColumns: GRID, minHeight: 80 }}>
                  <div className="cell-id">
                    <span className="mark" aria-hidden="true">{initials(r.company)}</span>
                    <div>
                      <p className="r1" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {r.position}
                        {!r.end_date ? <span className="pill p-hue">Current</span> : null}
                      </p>
                      <p className="r2">{[r.company, r.location, plural(n, 'achievement', 'achievements')].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                  <div className="chips hide-sm" style={{ flexWrap: 'nowrap', overflow: 'hidden' }}>
                    {r.technologies.slice(0, 3).map((t) => <span key={t} className="chip">{t}</span>)}
                    {r.technologies.length > 3 ? <span className="mute" style={{ fontSize: 12, alignSelf: 'center', whiteSpace: 'nowrap' }}>+{r.technologies.length - 3}</span> : null}
                  </div>
                  <div className="right num" style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14 }}>{monthRange(r.start_date, r.end_date)}</p>
                    <p className="mute" style={{ fontSize: 12 }}>{duration(monthsInclusive(r.start_date, r.end_date || nowMonth))}</p>
                  </div>
                  <button type="button" className="btn btn-text right" onClick={() => open(r)} aria-label={`Edit ${r.position} at ${r.company}`}>Edit</button>
                </li>
              )
            })}
          </ul>
        )}
        {!isLoading && shown.length === 0 ? (
          <div style={{ padding: '0 24px 20px' }}>
            <div className="empty-slot">
              <span>{needle ? `No roles match “${q.trim()}”.` : 'No roles yet.'}</span>
              <button type="button" className="btn btn-text" onClick={() => open(null)}>Add a role</button>
            </div>
          </div>
        ) : null}
      </section>

      {editId !== null ? (
        <Dialog
          title={editId === 'new' ? 'Add a role' : 'Edit role'}
          sub="Shows on the Experience page and the CV."
          onClose={close}
          saving={save.isPending}
          onSubmit={submit}
          footer={
            <>
              {editId !== 'new' ? <button type="button" className="btn btn-neg first" onClick={() => setConfirming(true)}>Delete role</button> : null}
              <button type="button" className="btn btn-line" onClick={close} disabled={save.isPending}>Cancel</button>
              <SaveButton saving={save.isPending} label={editId === 'new' ? 'Add role' : 'Save changes'} />
            </>
          }
        >
          <div className="form">
            <Field label="Position" error={err('position')}>{(p) => <input {...p} value={d.position} onChange={(e) => set('position', e.target.value)} />}</Field>
            <Field label="Company" error={err('company')}>{(p) => <input {...p} value={d.company} onChange={(e) => set('company', e.target.value)} />}</Field>
            <Field label="Location" error={err('location')}>{(p) => <input {...p} value={d.location} onChange={(e) => set('location', e.target.value)} />}</Field>
            <Field label="Company website" error={err('url')}>{(p) => <input {...p} type="url" placeholder="https://" value={d.url} onChange={(e) => set('url', e.target.value)} />}</Field>
            <Field label="Started" error={err('start')}>{(p) => <input {...p} type="month" value={d.start} onChange={(e) => set('start', e.target.value)} />}</Field>
            <Field label="Ended" error={err('end')} hint={d.current ? 'Shows as “now” while this is your current role.' : 'Leave empty if you are still there.'}>
              {(p) => <input {...p} type="month" value={d.current ? '' : d.end} disabled={d.current} onChange={(e) => set('end', e.target.value)} />}
            </Field>
            <div className="field span2" style={{ gap: 0 }}>
              <Switch checked={d.current} onChange={(v) => setD((p) => ({ ...p, current: v, end: v ? '' : p.end }))}>
                <span>
                  <span style={{ display: 'block', fontWeight: 500 }}>I work here now</span>
                  <span className="hint">Marks the role Current and shows it first.</span>
                </span>
              </Switch>
            </div>
            <Field label="What you did" span2 error={err('description')}>{(p) => <textarea {...p} rows={3} value={d.description} onChange={(e) => set('description', e.target.value)} />}</Field>
            <Field label="Key achievements" span2 error={err('achievements')} hint="One per line. Lead with the number where there is one.">
              {(p) => <textarea {...p} rows={4} value={d.achievements} onChange={(e) => set('achievements', e.target.value)} />}
            </Field>
            <Field label="Impact highlights" span2 error={err('highlights')} hint="Short, number first, one per line. Shown as pills on the Experience page.">
              {(p) => <textarea {...p} rows={3} value={d.highlights} onChange={(e) => set('highlights', e.target.value)} />}
            </Field>
            <Field label="Technologies" span2 error={err('techText')} hint="Separate with commas.">
              {(p) => <input {...p} value={d.techText} onChange={(e) => set('techText', e.target.value)} />}
            </Field>
          </div>
        </Dialog>
      ) : null}

      {confirming && typeof editId === 'number' ? (
        <ConfirmDialog
          title={`Delete ${d.position} at ${d.company}?`}
          description="It comes off the Experience page and the CV. This can't be undone."
          confirmLabel="Delete role"
          busy={remove.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => remove.mutate(editId)}
        />
      ) : null}
    </>
  )
}
