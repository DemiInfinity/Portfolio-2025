import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { apiError, fieldErrors } from '@/lib/errors'
import { commas, dayOf, daysUntil, fmtMon, plural, toArray } from '@/lib/format'
import { useQ } from '@/hooks/useQ'
import { useEditParam } from '@/hooks/useEditParam'
import Dialog, { SaveButton } from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Field from '@/components/ui/Field'
import Icon from '@/components/ui/Icon'
import Pill, { type PillTone } from '@/components/ui/Pill'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

export interface Certification {
  id: number
  name: string
  issuer: string
  issue_date: string
  expiry_date: string | null
  credential_id: string | null
  credential_url: string | null
  description: string | null
  skills: string[]
}

type Draft = { name: string; issuer: string; credId: string; issued: string; expiry: string; url: string; description: string; skills: string }
const EMPTY: Draft = { name: '', issuer: '', credId: '', issued: '', expiry: '', url: '', description: '', skills: '' }

export const CERTS_KEY = ['certifications'] as const

export const fetchCerts = async (): Promise<Certification[]> => {
  const res = await api.get('/certifications')
  return ((res.data?.data || []) as Certification[]).map((c) => ({ ...c, skills: toArray(c.skills) }))
}

/** The row's expiry pill (AdminCerts). */
export const expiryPill = (expiry: string | null | undefined, today: Date): [string, PillTone] => {
  if (!expiry) return ['No expiry', 'off']
  const days = daysUntil(expiry, today)
  if (days < 0) return ['Expired ' + fmtMon(expiry), 'neg']
  if (days <= 90) return [`Expires in ${days} days`, 'draft']
  return ['Valid to ' + fmtMon(expiry), 'live']
}

const toDraft = (c: Certification): Draft => ({
  name: c.name || '',
  issuer: c.issuer || '',
  credId: c.credential_id || '',
  issued: dayOf(c.issue_date),
  expiry: dayOf(c.expiry_date),
  url: c.credential_url || '',
  description: c.description || '',
  skills: c.skills.join(', '),
})

// H-3: PUT is a full replace, so the whole form is always sent.
const toBody = (d: Draft) => ({
  name: d.name.trim(),
  issuer: d.issuer.trim(),
  issue_date: d.issued,
  expiry_date: d.expiry || null,
  credential_id: d.credId.trim(),
  credential_url: d.url.trim(),
  description: d.description.trim(),
  skills: commas(d.skills),
})

const PATH: Record<string, keyof Draft> = { name: 'name', issuer: 'issuer', issue_date: 'issued', expiry_date: 'expiry', credential_id: 'credId', credential_url: 'url', description: 'description', skills: 'skills' }

const GRID = 'minmax(0, 1fr) auto 80px'

export default function Certifications() {
  const qc = useQueryClient()
  const { say } = useToast()
  const [q] = useQ()
  const { data: certs, isLoading } = useQuery({ queryKey: CERTS_KEY, queryFn: fetchCerts })

  const [editId, setEditId] = useState<number | 'new' | null>(null)
  const [d, setD] = useState<Draft>(EMPTY)
  const [tried, setTried] = useState(false)
  const [serverErr, setServerErr] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)

  const open = (c: Certification | null) => {
    setEditId(c ? c.id : 'new')
    setD(c ? toDraft(c) : EMPTY)
    setTried(false)
    setServerErr({})
    setConfirming(false)
  }
  const close = () => setEditId(null)
  useEditParam(certs, open)

  const set = (k: keyof Draft, v: string) => {
    setD((p) => ({ ...p, [k]: v }))
    setServerErr((e) => ({ ...e, [k]: '' }))
  }
  const err = (k: keyof Draft) => {
    if (tried && k === 'name' && !d.name.trim()) return "Add the certification's name."
    if (tried && k === 'issuer' && !d.issuer.trim()) return 'Add who issued it.'
    if (tried && k === 'issued' && !d.issued) return 'Add the issue date.'
    return serverErr[k] || null
  }

  const save = useMutation({
    mutationFn: (draft: Draft) => (editId === 'new' ? api.post('/certifications', toBody(draft)) : api.put(`/certifications/${editId}`, toBody(draft))),
    onSuccess: (_r, draft) => {
      qc.invalidateQueries({ queryKey: CERTS_KEY })
      close()
      say(`Saved ${draft.name.trim()}`)
    },
    onError: (e) => {
      const mapped: Record<string, string> = {}
      for (const [p, m] of Object.entries(fieldErrors(e))) if (PATH[p]) mapped[PATH[p]] = m
      if (Object.keys(mapped).length) setServerErr(mapped)
      else say(apiError(e))
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/certifications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CERTS_KEY })
      setConfirming(false)
      close()
      say('Certification deleted')
    },
    onError: (e) => {
      setConfirming(false)
      say(apiError(e, "Couldn't delete. Try again."))
    },
  })

  const submit = () => {
    setTried(true)
    if (!d.name.trim() || !d.issuer.trim() || !d.issued) return
    save.mutate(d)
  }

  const today = new Date()
  const n = certs?.length ?? 0
  const sorted = (certs || []).slice().sort((a, b) => (dayOf(a.issue_date) < dayOf(b.issue_date) ? 1 : -1))
  const needle = q.trim().toLowerCase()
  const shown = needle ? sorted.filter((c) => [c.name, c.issuer, ...c.skills].join(' ').toLowerCase().includes(needle)) : sorted

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Certifications</h1>
          <p className="ad-sub">
            {certs ? (n ? `${plural(n, 'certification', 'certifications')} on the About page and the CV.` : 'None listed yet. They show on the About page and the CV.') : ' '}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => open(null)}>
          <Icon name="plus" size={16} />
          Add certification
        </button>
      </div>

      <div className="two">
        <section className="card" aria-labelledby="ct-list-h">
          <div className="card-head">
            <h2 id="ct-list-h" className="card-title">Certifications <span className="mute num" style={{ fontWeight: 400 }}>{n}</span></h2>
          </div>
          {isLoading ? <SkeletonRows thumb={false} /> : null}
          {!isLoading && n === 0 ? (
            <div style={{ padding: '0 24px 24px' }}>
              <div className="empty-slot" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: 20 }}>
                <p style={{ color: '#241b33', fontWeight: 600, fontSize: 15 }}>No certifications yet</p>
                <p style={{ fontSize: 14, maxWidth: '48ch' }}>Add one with its credential link and it appears on the About page and in a Certifications section on the CV.</p>
                <button type="button" className="btn btn-line" onClick={() => open(null)} style={{ marginTop: 8 }}>Add your first certification</button>
              </div>
            </div>
          ) : null}
          {!isLoading && n > 0 ? (
            <ul className="rows" style={{ borderTop: '1px solid #f0eaf7' }}>
              {shown.map((c) => {
                const [label, tone] = expiryPill(c.expiry_date, today)
                return (
                  <li key={c.id} className="row" style={{ gridTemplateColumns: GRID, minHeight: 80 }}>
                    <div style={{ minWidth: 0 }}>
                      <p className="r1">{c.name}</p>
                      <p className="r2">{c.issuer} · issued {fmtMon(c.issue_date)}</p>
                    </div>
                    <Pill tone={tone}>{label}</Pill>
                    <button type="button" className="btn btn-text right" onClick={() => open(c)} aria-label={`Edit ${c.name}`}>Edit</button>
                  </li>
                )
              })}
            </ul>
          ) : null}
          {!isLoading && n > 0 && shown.length === 0 ? <p className="mute" style={{ padding: '12px 24px 20px' }}>No certifications match “{q.trim()}”.</p> : null}
        </section>

        <section aria-labelledby="ct-cv-h">
          <h2 id="ct-cv-h" className="rail-h">On the CV</h2>
          <div className="card card-pad">
            {n === 0 ? (
              <p className="mute" style={{ fontSize: 14 }}>The CV leaves out the Certifications section while this list is empty, so there's no blank heading.</p>
            ) : (
              <>
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 20 }}>Certifications</p>
                <ul style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sorted.map((c) => (
                    <li key={c.id}>
                      <p className="b" style={{ fontSize: 14 }}>{c.name}</p>
                      <p className="mute" style={{ fontSize: 13 }}>{c.issuer}, {dayOf(c.issue_date).slice(0, 4)}{c.credential_id ? ' · ID ' + c.credential_id : ''}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </div>

      {editId !== null ? (
        <Dialog
          title={editId === 'new' ? 'Add certification' : 'Edit certification'}
          sub="Name, issuer and issue date are needed. The rest is optional."
          onClose={close}
          saving={save.isPending}
          onSubmit={submit}
          footer={
            <>
              {editId !== 'new' ? <button type="button" className="btn btn-neg first" onClick={() => setConfirming(true)}>Delete</button> : null}
              <button type="button" className="btn btn-line" onClick={close} disabled={save.isPending}>Cancel</button>
              <SaveButton saving={save.isPending} label={editId === 'new' ? 'Add certification' : 'Save changes'} />
            </>
          }
        >
          <div className="form">
            <Field label="Certification name" span2 error={err('name')}>{(p) => <input {...p} value={d.name} onChange={(e) => set('name', e.target.value)} />}</Field>
            <Field label="Issuer" error={err('issuer')}>{(p) => <input {...p} value={d.issuer} onChange={(e) => set('issuer', e.target.value)} />}</Field>
            <Field label="Credential ID" controlClass="mono" error={err('credId')}>{(p) => <input {...p} value={d.credId} onChange={(e) => set('credId', e.target.value)} />}</Field>
            <Field label="Issued" error={err('issued')}>{(p) => <input {...p} type="date" value={d.issued} onChange={(e) => set('issued', e.target.value)} />}</Field>
            <Field label="Expires" error={err('expiry')} hint="Leave empty if it doesn't expire.">{(p) => <input {...p} type="date" value={d.expiry} onChange={(e) => set('expiry', e.target.value)} />}</Field>
            <Field label="Credential link" span2 error={err('url')} hint="Visitors can check it from the About page.">{(p) => <input {...p} type="url" placeholder="https://" value={d.url} onChange={(e) => set('url', e.target.value)} />}</Field>
            <Field label="What it covers" span2 error={err('description')}>{(p) => <textarea {...p} rows={3} value={d.description} onChange={(e) => set('description', e.target.value)} />}</Field>
            <Field label="Skills" span2 error={err('skills')} hint="Separate with commas.">{(p) => <input {...p} value={d.skills} onChange={(e) => set('skills', e.target.value)} />}</Field>
          </div>
        </Dialog>
      ) : null}

      {confirming && typeof editId === 'number' ? (
        <ConfirmDialog
          title={`Delete ${d.name}?`}
          description="It comes off the About page and the CV. This can't be undone."
          confirmLabel="Delete certification"
          busy={remove.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => remove.mutate(editId)}
        />
      ) : null}
    </>
  )
}
