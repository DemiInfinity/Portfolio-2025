import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { apiError, fieldErrors } from '@/lib/errors'
import { lines, monthOf, monthToApi, plural, toArray } from '@/lib/format'
import { useQ } from '@/hooks/useQ'
import { useEditParam } from '@/hooks/useEditParam'
import Dialog, { SaveButton } from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Field from '@/components/ui/Field'
import Icon from '@/components/ui/Icon'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

export interface EducationEntry {
  id: number
  institution: string
  degree: string
  field_of_study?: string | null
  location?: string | null
  start_date?: string | null
  end_date?: string | null
  grade?: string | null
  gpa?: string | null
  description?: string | null
  achievements: string[]
}

type Draft = { institution: string; degree: string; field: string; location: string; start: string; end: string; grade: string; description: string; achievements: string }
const EMPTY: Draft = { institution: '', degree: '', field: '', location: '', start: '', end: '', grade: '', description: '', achievements: '' }

export const EDUCATION_KEY = ['education'] as const

export const fetchEducation = async (): Promise<EducationEntry[]> => {
  const res = await api.get('/education')
  return ((res.data?.data || []) as EducationEntry[]).map((e) => ({ ...e, achievements: toArray(e.achievements) }))
}

const yr = (v?: string | null) => (v ? monthOf(v).slice(0, 4) : '')
const years = (start?: string | null, end?: string | null) => (yr(start) || '—') + ' – ' + (end ? yr(end) : 'now')

const toDraft = (e: EducationEntry): Draft => ({
  institution: e.institution || '',
  degree: e.degree || '',
  field: e.field_of_study || '',
  location: e.location || '',
  start: monthOf(e.start_date),
  end: monthOf(e.end_date),
  grade: (e.grade ?? e.gpa ?? '').slice(0, 10),
  description: e.description || '',
  achievements: e.achievements.join('\n'),
})

// H-3: education PUT is a full replace, so the whole form is always sent.
const toBody = (d: Draft) => ({
  institution: d.institution.trim(),
  degree: d.degree.trim(),
  field_of_study: d.field.trim(),
  location: d.location.trim(),
  start_date: monthToApi(d.start),
  end_date: monthToApi(d.end),
  grade: d.grade.trim(),
  description: d.description.trim(),
  achievements: lines(d.achievements),
})

const PATH: Record<string, keyof Draft> = { institution: 'institution', degree: 'degree', field_of_study: 'field', location: 'location', start_date: 'start', end_date: 'end', grade: 'grade', gpa: 'grade', description: 'description', achievements: 'achievements' }

const GRID = 'minmax(0, 1fr) auto 80px'

export default function Education() {
  const qc = useQueryClient()
  const { say } = useToast()
  const [q] = useQ()
  const { data: entries, isLoading } = useQuery({ queryKey: EDUCATION_KEY, queryFn: fetchEducation })

  const [editId, setEditId] = useState<number | 'new' | null>(null)
  const [d, setD] = useState<Draft>(EMPTY)
  const [tried, setTried] = useState(false)
  const [serverErr, setServerErr] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)

  const open = (e: EducationEntry | null) => {
    setEditId(e ? e.id : 'new')
    setD(e ? toDraft(e) : EMPTY)
    setTried(false)
    setServerErr({})
    setConfirming(false)
  }
  const close = () => setEditId(null)
  useEditParam(entries, open)

  const set = (k: keyof Draft, v: string) => {
    setD((p) => ({ ...p, [k]: v }))
    setServerErr((e) => ({ ...e, [k]: '' }))
  }
  const err = (k: keyof Draft) => {
    if (tried && k === 'institution' && !d.institution.trim()) return 'Add the institution.'
    if (tried && k === 'degree' && !d.degree.trim()) return 'Add the degree or qualification.'
    return serverErr[k] || null
  }

  const save = useMutation({
    mutationFn: (draft: Draft) => (editId === 'new' ? api.post('/education', toBody(draft)) : api.put(`/education/${editId}`, toBody(draft))),
    onSuccess: (_r, draft) => {
      qc.invalidateQueries({ queryKey: EDUCATION_KEY })
      close()
      say(`Saved ${draft.degree.trim()} at ${draft.institution.trim()}`)
    },
    onError: (e) => {
      const mapped: Record<string, string> = {}
      for (const [p, m] of Object.entries(fieldErrors(e))) if (PATH[p]) mapped[PATH[p]] = m
      if (Object.keys(mapped).length) setServerErr(mapped)
      else say(apiError(e))
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/education/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EDUCATION_KEY })
      setConfirming(false)
      close()
      say('Entry deleted')
    },
    onError: (e) => {
      setConfirming(false)
      say(apiError(e, "Couldn't delete. Try again."))
    },
  })

  const submit = () => {
    setTried(true)
    if (!d.institution.trim() || !d.degree.trim()) return
    save.mutate(d)
  }

  const sorted = (entries || []).slice().sort((a, b) => ((a.start_date || '') < (b.start_date || '') ? 1 : -1))
  const needle = q.trim().toLowerCase()
  const shown = needle ? sorted.filter((e) => [e.degree, e.field_of_study, e.institution, e.location].join(' ').toLowerCase().includes(needle)) : sorted
  const n = entries?.length ?? 0

  // Preview: the open draft (live), otherwise the newest entry.
  const editing = editId !== null
  const first = sorted[0]
  const p = editing
    ? { degree: d.degree || '[Degree]', field: d.field, institution: d.institution || '[Institution]', years: years(monthToApi(d.start), monthToApi(d.end)), description: d.description, grade: d.grade }
    : first
      ? { degree: first.degree, field: first.field_of_study || '', institution: first.institution, years: years(first.start_date, first.end_date), description: first.description || '', grade: first.grade ?? first.gpa ?? '' }
      : { degree: '[Degree]', field: '', institution: '[Institution]', years: years(null, null), description: '', grade: '' }

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Education</h1>
          <p className="ad-sub">{entries ? `${plural(n, 'entry', 'entries')}. Shown on the Experience page and the CV.` : ' '}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => open(null)}>
          <Icon name="plus" size={16} />
          Add education
        </button>
      </div>

      <div className="two">
        <section className="card" aria-labelledby="ed-list-h">
          <div className="card-head">
            <h2 id="ed-list-h" className="card-title">Entries <span className="mute num" style={{ fontWeight: 400 }}>{n}</span></h2>
          </div>
          {isLoading ? (
            <SkeletonRows thumb={false} />
          ) : (
            <ul className="rows" style={{ borderTop: '1px solid #f0eaf7' }}>
              {shown.map((e) => (
                <li key={e.id} className="row" style={{ gridTemplateColumns: GRID, minHeight: 80 }}>
                  <div className="cell-id">
                    <span className="mark" aria-hidden="true">{(e.institution.match(/[A-Z]/g) || ['?']).slice(0, 2).join('')}</span>
                    <div>
                      <p className="r1">{[e.degree, e.field_of_study].filter(Boolean).join(' ')}</p>
                      <p className="r2">{[e.institution, e.location].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                  <span className="num mute" style={{ fontSize: 13 }}>{years(e.start_date, e.end_date)}</span>
                  <button type="button" className="btn btn-text right" onClick={() => open(e)} aria-label={`Edit ${e.degree} at ${e.institution}`}>Edit</button>
                </li>
              ))}
            </ul>
          )}
          {needle && !isLoading && shown.length === 0 ? (
            <p className="mute" style={{ padding: '12px 24px 0' }}>No education matches “{q.trim()}”.</p>
          ) : null}
          <div style={{ padding: '0 24px 20px' }}>
            <div className="empty-slot" style={{ marginTop: 4 }}>
              <span>A course, bootcamp or school you want on the CV goes here too.</span>
              <button type="button" className="btn btn-text" onClick={() => open(null)}>Add one</button>
            </div>
          </div>
        </section>

        <section aria-labelledby="ed-prev-h" style={editing ? { position: 'relative', zIndex: 61 } : undefined}>
          <h2 id="ed-prev-h" className="rail-h">How it reads on the site</h2>
          <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="edu-preview">
            <p className="mute" style={{ fontSize: 12 }}>Experience page and CV, {editing ? 'with your unsaved changes' : 'as it is now'}</p>
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 22, marginTop: 4 }}>Education</p>
            <p className="b" style={{ fontSize: 15 }}>{[p.degree, p.field].filter(Boolean).join(' ')}</p>
            <p style={{ fontSize: 14, color: '#5b21b6', fontWeight: 600 }}>{p.institution}, {p.years}</p>
            {p.description ? <p style={{ fontSize: 14, lineHeight: 1.65, marginTop: 6 }}>{p.description}</p> : null}
            {p.grade.trim() ? <p className="mute" style={{ fontSize: 13 }}>Grade: {p.grade}</p> : null}
          </div>
        </section>
      </div>

      {editing ? (
        <Dialog
          title={editId === 'new' ? 'Add education' : 'Edit education'}
          sub="The preview beside the list updates as you type."
          onClose={close}
          saving={save.isPending}
          onSubmit={submit}
          footer={
            <>
              {editId !== 'new' ? <button type="button" className="btn btn-neg first" onClick={() => setConfirming(true)}>Delete entry</button> : null}
              <button type="button" className="btn btn-line" onClick={close} disabled={save.isPending}>Cancel</button>
              <SaveButton saving={save.isPending} label={editId === 'new' ? 'Add entry' : 'Save changes'} />
            </>
          }
        >
          <div className="form">
            <Field label="Institution" error={err('institution')}>{(c) => <input {...c} value={d.institution} onChange={(e) => set('institution', e.target.value)} />}</Field>
            <Field label="Degree or qualification" error={err('degree')}>{(c) => <input {...c} value={d.degree} onChange={(e) => set('degree', e.target.value)} />}</Field>
            <Field label="Field of study" error={err('field')}>{(c) => <input {...c} value={d.field} onChange={(e) => set('field', e.target.value)} />}</Field>
            <Field label="Location" error={err('location')}>{(c) => <input {...c} value={d.location} onChange={(e) => set('location', e.target.value)} />}</Field>
            <Field label="Started" error={err('start')}>{(c) => <input {...c} type="month" value={d.start} onChange={(e) => set('start', e.target.value)} />}</Field>
            <Field label="Finished" error={err('end')} hint="Leave empty if you are still studying.">{(c) => <input {...c} type="month" value={d.end} onChange={(e) => set('end', e.target.value)} />}</Field>
            <Field label="Grade" error={err('grade')} hint={<span className="num">Up to 10 characters, like 2:1 or First. {10 - d.grade.length} left.</span>}>
              {(c) => <input {...c} maxLength={10} value={d.grade} onChange={(e) => set('grade', e.target.value.slice(0, 10))} />}
            </Field>
            <span />
            <Field label="Description" span2 error={err('description')}>{(c) => <textarea {...c} rows={3} value={d.description} onChange={(e) => set('description', e.target.value)} />}</Field>
            <Field label="Achievements" span2 error={err('achievements')} hint="One per line.">{(c) => <textarea {...c} rows={2} value={d.achievements} onChange={(e) => set('achievements', e.target.value)} />}</Field>
          </div>
        </Dialog>
      ) : null}

      {confirming && typeof editId === 'number' ? (
        <ConfirmDialog
          title={`Delete ${d.degree} at ${d.institution}?`}
          description="It comes off the Experience page and the CV. This can't be undone."
          confirmLabel="Delete entry"
          busy={remove.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => remove.mutate(editId)}
        />
      ) : null}
    </>
  )
}
