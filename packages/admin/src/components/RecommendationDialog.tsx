import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { apiError, fieldErrors } from '@/lib/errors'
import { monthOf } from '@/lib/format'
import { CV_STATUS_KEY } from '@/lib/cv'
import { RECS_KEY, type Recommendation } from '@/lib/recommendations'
import { URL_RE } from '@/lib/validation'
import Dialog, { SaveButton } from './ui/Dialog'
import ConfirmDialog from './ui/ConfirmDialog'
import Field from './ui/Field'
import LimitField from './ui/LimitField'
import Switch from './ui/Switch'
import { useToast } from './ui/Toast'

type Draft = { quote: string; full: string; name: string; role: string; company: string; relationship: string; source: string; url: string; date: string; cv: boolean }

const LIM = { quote: 600, full: 5000, name: 120, role: 160, company: 160, relationship: 200, source: 80 } as const
const PATH: Record<string, keyof Draft> = { quote: 'quote', full_text: 'full', name: 'name', role: 'role', company: 'company', relationship: 'relationship', source: 'source', source_url: 'url', date: 'date', show_on_cv: 'cv' }

const toDraft = (r: Recommendation | null): Draft => ({
  quote: r?.quote || '', full: r?.full_text || '', name: r?.name || '', role: r?.role || '', company: r?.company || '', relationship: r?.relationship || '',
  source: r?.source || '', url: r?.source_url || '', date: monthOf(r?.date), cv: !!r?.show_on_cv,
})

export function validateRec(d: Draft): Partial<Record<keyof Draft, string>> {
  const e: Partial<Record<keyof Draft, string>> = {}
  if (!d.quote.trim()) e.quote = 'Add the quote.'
  if (!d.name.trim()) e.name = 'Add who wrote it.'
  for (const k of Object.keys(LIM) as (keyof typeof LIM)[]) if (!e[k] && d[k].trim().length > LIM[k]) e[k] = `Keep this under ${LIM[k]} characters.`
  if (d.url.trim() && !URL_RE.test(d.url.trim())) e.url = 'Use a full link starting with https://'
  return e
}

type Props = { rec: Recommendation | null; nextSortOrder: number; onClose: () => void }

export default function RecommendationDialog({ rec, nextSortOrder, onClose }: Props) {
  const qc = useQueryClient()
  const { say } = useToast()
  const [d, setD] = useState<Draft>(() => toDraft(rec))
  const [tried, setTried] = useState(false)
  const [serverErr, setServerErr] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((p) => ({ ...p, [k]: v }))
    setServerErr((e) => ({ ...e, [k]: '' }))
  }
  const client = tried ? validateRec(d) : {}
  const err = (k: keyof Draft) => client[k] || serverErr[k] || null
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: RECS_KEY })
    qc.invalidateQueries({ queryKey: CV_STATUS_KEY })
  }

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        quote: d.quote.trim(), full_text: d.full.trim() || null, name: d.name.trim(), role: d.role.trim() || null, company: d.company.trim() || null,
        relationship: d.relationship.trim() || null, source: d.source.trim() || null, source_url: d.url.trim() || null, date: d.date || null, show_on_cv: d.cv,
      }
      return rec ? api.put(`/recommendations/${rec.id}`, body) : api.post('/recommendations', { ...body, sort_order: nextSortOrder } as Record<string, unknown>)
    },
    onSuccess: () => {
      invalidate()
      onClose()
      say(`Saved the recommendation from ${d.name.trim()}`)
    },
    onError: (e) => {
      const mapped: Record<string, string> = {}
      for (const [p, m] of Object.entries(fieldErrors(e))) if (PATH[p]) mapped[PATH[p]] = m
      if (Object.keys(mapped).length) setServerErr(mapped)
      else say(apiError(e))
    },
  })
  const remove = useMutation({
    mutationFn: () => api.delete(`/recommendations/${rec!.id}`),
    onSuccess: () => {
      invalidate()
      setConfirming(false)
      onClose()
      say('Recommendation deleted')
    },
    onError: (e) => {
      setConfirming(false)
      say(apiError(e, "Couldn't delete. Try again."))
    },
  })

  return (
    <>
      <Dialog
        title={rec ? 'Edit recommendation' : 'Add recommendation'}
        sub="Shows under “Kind words” on the About page."
        onClose={onClose}
        saving={save.isPending}
        onSubmit={() => {
          setTried(true)
          if (Object.keys(validateRec(d)).length) return
          save.mutate()
        }}
        footer={
          <>
            {rec ? <button type="button" className="btn btn-neg first" onClick={() => setConfirming(true)}>Delete recommendation</button> : null}
            <button type="button" className="btn btn-line" onClick={onClose} disabled={save.isPending}>Cancel</button>
            <SaveButton saving={save.isPending} label={rec ? 'Save changes' : 'Add recommendation'} />
          </>
        }
      >
        <div className="form">
          <LimitField span2 multiline rows={3} label="Quote" max={LIM.quote} value={d.quote} onChange={(v) => set('quote', v)} error={err('quote')} hint="The short quote on About." />
          <LimitField span2 multiline code rows={6} label="Full recommendation" max={LIM.full} value={d.full} onChange={(v) => set('full', v)} error={err('full')} hint="Optional. Markdown. Shown behind “Read the full recommendation”." />
          <Field label="Name" error={err('name')}>{(p) => <input {...p} value={d.name} onChange={(e) => set('name', e.target.value)} />}</Field>
          <span />
          <Field label="Role" error={err('role')}>{(p) => <input {...p} value={d.role} onChange={(e) => set('role', e.target.value)} />}</Field>
          <Field label="Company" error={err('company')}>{(p) => <input {...p} value={d.company} onChange={(e) => set('company', e.target.value)} />}</Field>
          <Field label="Relationship" span2 error={err('relationship')} hint="Like “managed Demi directly”.">{(p) => <input {...p} value={d.relationship} onChange={(e) => set('relationship', e.target.value)} />}</Field>
          <Field label="Source" error={err('source')}>{(p) => <input {...p} placeholder="LinkedIn" value={d.source} onChange={(e) => set('source', e.target.value)} />}</Field>
          <Field label="Source link" error={err('url')}>{(p) => <input {...p} type="url" placeholder="https://" value={d.url} onChange={(e) => set('url', e.target.value)} />}</Field>
          <Field label="Date" error={err('date')}>{(p) => <input {...p} type="month" value={d.date} onChange={(e) => set('date', e.target.value)} />}</Field>
          <span />
          <div className="field span2" style={{ gap: 0 }}>
            <Switch checked={d.cv} onChange={(v) => set('cv', v)}>
              <span>
                <span style={{ display: 'block', fontWeight: 500 }}>Show on the CV</span>
                <span className="hint">The CV shows the first one with this on.</span>
              </span>
            </Switch>
          </div>
        </div>
      </Dialog>
      {confirming && rec ? (
        <ConfirmDialog
          title={`Delete the recommendation from ${rec.name}?`}
          description="It comes off the About page and the CV. This can't be undone."
          confirmLabel="Delete recommendation"
          busy={remove.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => remove.mutate()}
        />
      ) : null}
    </>
  )
}
