import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { apiError, fieldErrors } from '@/lib/errors'
import { commas, fmtMon, fmtMonth, isoMonth, monthOf, monthToApi, toArray } from '@/lib/format'
import { useQ } from '@/hooks/useQ'
import { useEditParam } from '@/hooks/useEditParam'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Field from '@/components/ui/Field'
import Segmented from '@/components/ui/Segmented'
import Icon from '@/components/ui/Icon'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

export type CourseStatus = 'not_started' | 'in_progress' | 'completed' | 'paused'
export interface Course {
  id: number
  title: string
  description?: string | null
  provider?: string | null
  progress: number
  category?: string | null
  start_date?: string | null
  estimated_completion?: string | null
  resources: string[]
  status: CourseStatus
}
export type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export interface Skill {
  id: number
  name: string
  description?: string | null
  category?: string | null
  level: Level
}

export const LEARNING_KEY = ['learning'] as const
export const SKILLS_KEY = ['skills'] as const

export const fetchCourses = async (): Promise<{ items: Course[]; hasProvider: boolean }> => {
  const res = await api.get('/learning')
  const raw = (res.data?.data || []) as Course[]
  return {
    items: raw.map((c) => ({ ...c, progress: Number(c.progress) || 0, resources: toArray(c.resources) })),
    // H-2: `provider` is omitted until the owner runs the migration; keep the field hidden until it appears.
    hasProvider: raw.some((c) => Object.prototype.hasOwnProperty.call(c, 'provider')),
  }
}
export const fetchSkills = async (): Promise<Skill[]> => {
  const res = await api.get('/skills')
  return (res.data?.data || []) as Skill[]
}

/** not_started displays as In progress (at its progress, usually 0). */
export const shownStatus = (s: CourseStatus): 'in_progress' | 'completed' | 'paused' => (s === 'not_started' ? 'in_progress' : s)
export const isOverdue = (c: Course, nowMonth: string) => shownStatus(c.status) !== 'completed' && !!c.estimated_completion && monthOf(c.estimated_completion) < nowMonth
const shortTitle = (t: string) => t.split(':')[0].trim()

export function learningSub(courses: Course[], nowMonth: string) {
  const active = courses.filter((c) => shownStatus(c.status) === 'in_progress')
  const avg = active.length ? Math.round(active.reduce((a, c) => a + c.progress, 0) / active.length) : 0
  const over = courses.filter((c) => isOverdue(c, nowMonth))
  const tail = over.length ? ` ${over.map((c) => shortTitle(c.title)).join(', ')} passed ${over.length === 1 ? 'its' : 'their'} ${fmtMonth(over[0].estimated_completion)} target.` : ''
  return `${active.length} ${active.length === 1 ? 'course' : 'courses'} in progress, ${avg}% on average.${tail}`
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const clamp = (n: number) => Math.max(0, Math.min(100, n))

type CourseDraft = { title: string; provider: string; category: string; goal: string; progress: number; start: string; target: string; status: 'in_progress' | 'completed' | 'paused'; resources: string }
type SkillDraft = { name: string; category: string; level: Level; description: string }

const COURSE_PATH: Record<string, keyof CourseDraft> = { title: 'title', provider: 'provider', category: 'category', description: 'goal', progress: 'progress', start_date: 'start', estimated_completion: 'target', status: 'status', resources: 'resources' }
const SKILL_PATH: Record<string, keyof SkillDraft> = { name: 'name', category: 'category', level: 'level', description: 'description' }

const COURSE_GRID = 'minmax(0, 1fr) 220px 150px 80px'
const SKILL_GRID = 'minmax(0, 1fr) 130px 80px'

function useCourseStepper() {
  const qc = useQueryClient()
  const { say } = useToast()
  const [local, setLocal] = useState<Record<number, number>>({})
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const base = useRef<Record<number, number>>({})

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  const send = async (id: number, value: number) => {
    const before = base.current[id]
    try {
      await api.put(`/learning/${id}`, value >= 100 ? { progress: 100, status: 'completed' } : { progress: value })
      qc.setQueryData<{ items: Course[]; hasProvider: boolean }>(LEARNING_KEY, (old) =>
        old ? { ...old, items: old.items.map((c) => (c.id === id ? { ...c, progress: value, status: value >= 100 ? 'completed' : c.status } : c)) } : old,
      )
      say(`Saved: ${value}%`)
    } catch {
      qc.setQueryData<{ items: Course[]; hasProvider: boolean }>(LEARNING_KEY, (old) =>
        old ? { ...old, items: old.items.map((c) => (c.id === id ? { ...c, progress: before } : c)) } : old,
      )
      say("Couldn't save progress.")
    } finally {
      delete base.current[id]
      setLocal((l) => {
        const n = { ...l }
        delete n[id]
        return n
      })
    }
  }

  /** Optimistic step; rapid clicks collapse into one PUT 400 ms after the last, with the last value. */
  const step = (c: Course, delta: number) => {
    const current = local[c.id] ?? c.progress
    const next = clamp(current + delta)
    if (next === current) return
    if (base.current[c.id] === undefined) base.current[c.id] = c.progress
    setLocal((l) => ({ ...l, [c.id]: next }))
    clearTimeout(timers.current[c.id])
    timers.current[c.id] = setTimeout(() => send(c.id, next), 400)
  }

  return { value: (c: Course) => local[c.id] ?? c.progress, step }
}

export default function Learning() {
  const qc = useQueryClient()
  const { say } = useToast()
  const [q] = useQ()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'skills' ? 'skills' : 'courses'
  const setTab = (t: 'courses' | 'skills') =>
    setParams((p) => {
      const n = new URLSearchParams(p)
      if (t === 'skills') n.set('tab', 'skills')
      else n.delete('tab')
      return n
    }, { replace: true })

  const coursesQ = useQuery({ queryKey: LEARNING_KEY, queryFn: fetchCourses })
  const skillsQ = useQuery({ queryKey: SKILLS_KEY, queryFn: fetchSkills })
  const courses = coursesQ.data?.items || []
  const hasProvider = !!coursesQ.data?.hasProvider
  const skills = skillsQ.data || []
  const stepper = useCourseStepper()
  const nowMonth = isoMonth(new Date())

  // Editors
  const [kind, setKind] = useState<'course' | 'skill' | null>(null)
  const [editId, setEditId] = useState<number | 'new'>('new')
  const [cd, setCd] = useState<CourseDraft | null>(null)
  const [sd, setSd] = useState<SkillDraft | null>(null)
  const [tried, setTried] = useState(false)
  const [serverErr, setServerErr] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)

  const openCourse = (c: Course | null) => {
    setKind('course')
    setEditId(c ? c.id : 'new')
    setCd(
      c
        ? { title: c.title, provider: c.provider || '', category: c.category || '', goal: c.description || '', progress: c.progress, start: monthOf(c.start_date), target: monthOf(c.estimated_completion), status: shownStatus(c.status), resources: c.resources.join(', ') }
        : { title: '', provider: '', category: '', goal: '', progress: 0, start: nowMonth, target: '', status: 'in_progress', resources: '' },
    )
    setTried(false)
    setServerErr({})
    setConfirming(false)
  }
  const openSkill = (k: Skill | null) => {
    setKind('skill')
    setEditId(k ? k.id : 'new')
    setSd(k ? { name: k.name, category: k.category || '', level: (k.level || 'intermediate').toLowerCase() as Level, description: k.description || '' } : { name: '', category: '', level: 'intermediate', description: '' })
    setTried(false)
    setServerErr({})
    setConfirming(false)
  }
  const close = () => setKind(null)
  useEditParam<Course | Skill>(tab === 'courses' ? coursesQ.data?.items : skillsQ.data, (item) => (tab === 'courses' ? openCourse(item as Course) : openSkill(item as Skill)))

  const mapErr = (e: unknown, path: Record<string, string>) => {
    const mapped: Record<string, string> = {}
    for (const [p, m] of Object.entries(fieldErrors(e))) if (path[p]) mapped[path[p]] = m
    if (Object.keys(mapped).length) setServerErr(mapped)
    else say(apiError(e))
  }

  const saveCourse = useMutation({
    mutationFn: (d: CourseDraft) => {
      const body: Record<string, unknown> = {
        title: d.title.trim(),
        category: d.category.trim(),
        description: d.goal.trim() || null,
        progress: d.status === 'completed' ? 100 : d.progress,
        start_date: monthToApi(d.start),
        estimated_completion: monthToApi(d.target),
        status: d.progress >= 100 ? 'completed' : d.status,
        resources: commas(d.resources),
      }
      if (hasProvider) body.provider = d.provider.trim() || null
      return editId === 'new' ? api.post('/learning', body) : api.put(`/learning/${editId}`, body)
    },
    onSuccess: (_r, d) => {
      qc.invalidateQueries({ queryKey: LEARNING_KEY })
      close()
      say(`Saved ${shortTitle(d.title)}`)
    },
    onError: (e) => mapErr(e, COURSE_PATH),
  })
  const saveSkill = useMutation({
    mutationFn: (d: SkillDraft) => {
      const body = { name: d.name.trim(), category: d.category.trim(), level: d.level, description: d.description.trim() }
      return editId === 'new' ? api.post('/skills', body) : api.put(`/skills/${editId}`, body)
    },
    onSuccess: (_r, d) => {
      qc.invalidateQueries({ queryKey: SKILLS_KEY })
      close()
      say(`Saved ${shortTitle(d.name)}`)
    },
    onError: (e) => mapErr(e, SKILL_PATH),
  })
  const remove = useMutation({
    mutationFn: () => api.delete(kind === 'course' ? `/learning/${editId}` : `/skills/${editId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kind === 'course' ? LEARNING_KEY : SKILLS_KEY })
      setConfirming(false)
      close()
      say('Removed')
    },
    onError: (e) => {
      setConfirming(false)
      say(apiError(e, "Couldn't remove. Try again."))
    },
  })

  const needle = q.trim().toLowerCase()
  const shownCourses = needle ? courses.filter((c) => [c.title, c.category, c.provider].join(' ').toLowerCase().includes(needle)) : courses
  const shownSkills = needle ? skills.filter((k) => [k.name, k.category, k.description].join(' ').toLowerCase().includes(needle)) : skills

  const cErr = (k: keyof CourseDraft) => (tried && k === 'title' && !cd?.title.trim() ? 'Add the course title.' : serverErr[k] || null)
  const sErr = (k: keyof SkillDraft) => (tried && k === 'name' && !sd?.name.trim() ? 'Name the skill.' : serverErr[k] || null)
  const setC = <K extends keyof CourseDraft>(k: K, v: CourseDraft[K]) => setCd((p) => (p ? { ...p, [k]: v } : p))
  const setS = <K extends keyof SkillDraft>(k: K, v: SkillDraft[K]) => setSd((p) => (p ? { ...p, [k]: v } : p))
  const saving = saveCourse.isPending || saveSkill.isPending

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Learning</h1>
          <p className="ad-sub">{coursesQ.data ? learningSub(courses, nowMonth) : ' '}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => (tab === 'courses' ? openCourse(null) : openSkill(null))}>
          <Icon name="plus" size={16} />
          {tab === 'courses' ? 'Add course' : 'Add skill'}
        </button>
      </div>

      <div className="tabs" role="tablist" aria-label="Learning">
        <button type="button" role="tab" id="lr-tab-c" aria-selected={tab === 'courses'} aria-controls="lr-panel" aria-label={`Courses ${courses.length}`} onClick={() => setTab('courses')}>Courses<span className="n">{courses.length}</span></button>
        <button type="button" role="tab" id="lr-tab-s" aria-selected={tab === 'skills'} aria-controls="lr-panel" aria-label={`Skills ${skills.length}`} onClick={() => setTab('skills')}>Skills<span className="n">{skills.length}</span></button>
      </div>

      {tab === 'courses' ? (
        <section id="lr-panel" className="card" role="tabpanel" aria-labelledby="lr-tab-c">
          <div className="lh" style={{ gridTemplateColumns: COURSE_GRID }}>
            <span>Course</span><span>Progress</span><span className="right">Update</span><span className="sr">Actions</span>
          </div>
          {coursesQ.isLoading ? <SkeletonRows thumb={false} /> : (
            <ul className="rows">
              {shownCourses.map((c) => {
                const p = stepper.value(c)
                const st = shownStatus(c.status)
                const meta = [hasProvider && c.provider ? c.provider : null, c.start_date ? 'started ' + fmtMon(c.start_date) : null, c.estimated_completion ? 'target ' + fmtMon(c.estimated_completion) : null].filter(Boolean).join(' · ')
                return (
                  <li key={c.id} className="row" style={{ gridTemplateColumns: COURSE_GRID, minHeight: 84 }}>
                    <div style={{ minWidth: 0 }}>
                      <p className="r1" style={{ whiteSpace: 'normal' }}>{c.title}</p>
                      <p className="r2" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', whiteSpace: 'normal' }}>
                        {meta}
                        {isOverdue(c, nowMonth) ? <span className="pill p-draft" style={{ whiteSpace: 'normal', height: 'auto', minHeight: 24, flex: '0 1 auto', maxWidth: '100%', padding: '2px 10px' }}>Past its {fmtMonth(c.estimated_completion)} target</span> : null}
                        {st === 'completed' ? <span className="pill p-live">Completed</span> : null}
                        {st === 'paused' ? <span className="pill p-off">Paused</span> : null}
                      </p>
                    </div>
                    <div className="hide-sm" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="prog" style={{ flex: 1 }} role="progressbar" aria-label={`${c.title} progress`} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}><span style={{ width: p + '%' }} /></div>
                      <span className="num" style={{ width: 40, textAlign: 'right', fontSize: 13 }}>{p}%</span>
                    </div>
                    <div className="stepper right" role="group" aria-label={`Change progress for ${c.title}`}>
                      <button type="button" onClick={() => stepper.step(c, -5)} disabled={p <= 0} aria-label="Down 5%">−</button>
                      <output aria-live="polite">{p}%</output>
                      <button type="button" onClick={() => stepper.step(c, 5)} disabled={p >= 100} aria-label="Up 5%">+</button>
                    </div>
                    <button type="button" className="btn btn-text right" onClick={() => openCourse(c)} aria-label={`Edit ${c.title}`}>Edit</button>
                  </li>
                )
              })}
            </ul>
          )}
          {!coursesQ.isLoading && shownCourses.length === 0 ? (
            <div style={{ padding: '0 24px 20px' }}>
              <div className="empty-slot">
                <span>{needle ? `No courses match “${q.trim()}”.` : 'No courses yet.'}</span>
                <button type="button" className="btn btn-text" onClick={() => openCourse(null)}>Add course</button>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <section id="lr-panel" className="card" role="tabpanel" aria-labelledby="lr-tab-s" style={{ maxWidth: 760 }}>
          <div className="lh" style={{ gridTemplateColumns: SKILL_GRID }}><span>Skill</span><span>Level</span><span className="sr">Actions</span></div>
          {skillsQ.isLoading ? <SkeletonRows thumb={false} /> : (
            <ul className="rows">
              {shownSkills.map((k) => {
                const lv = (k.level || 'intermediate').toLowerCase()
                return (
                  <li key={k.id} className="row" style={{ gridTemplateColumns: SKILL_GRID }}>
                    <div style={{ minWidth: 0 }}>
                      <p className="r1">{k.name}</p>
                      <p className="r2">{[k.category, k.description].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span><span className={'pill ' + (lv === 'advanced' || lv === 'expert' ? 'p-hue' : 'p-off')}>{cap(lv)}</span></span>
                    <button type="button" className="btn btn-text right" onClick={() => openSkill(k)} aria-label={`Edit ${k.name}`}>Edit</button>
                  </li>
                )
              })}
            </ul>
          )}
          {!skillsQ.isLoading && shownSkills.length === 0 ? (
            <div style={{ padding: '0 24px 20px' }}>
              <div className="empty-slot">
                <span>{needle ? `No skills match “${q.trim()}”.` : 'No skills yet.'}</span>
                <button type="button" className="btn btn-text" onClick={() => openSkill(null)}>Add skill</button>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {kind === 'course' && cd ? (
        <Dialog
          title={editId === 'new' ? 'Add course' : 'Edit course'}
          sub="Shows under “Currently learning” on the About and Learning pages."
          onClose={close}
          saving={saving}
          onSubmit={() => {
            setTried(true)
            if (!cd.title.trim()) return
            saveCourse.mutate(cd)
          }}
          footer={
            <>
              {editId !== 'new' ? <button type="button" className="btn btn-neg first" onClick={() => setConfirming(true)}>Remove course</button> : null}
              <button type="button" className="btn btn-line" onClick={close} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <><span className="spin" aria-hidden="true" />Saving</> : editId === 'new' ? 'Add' : 'Save changes'}</button>
            </>
          }
        >
          <div className="form">
            <Field label="Course title" span2 error={cErr('title')}>{(p) => <input {...p} value={cd.title} onChange={(e) => setC('title', e.target.value)} />}</Field>
            {hasProvider ? <Field label="Provider" error={cErr('provider')}>{(p) => <input {...p} value={cd.provider} onChange={(e) => setC('provider', e.target.value)} />}</Field> : null}
            <Field label="Category" error={cErr('category')}>{(p) => <input {...p} value={cd.category} onChange={(e) => setC('category', e.target.value)} />}</Field>
            <Field label="Goal" span2 error={cErr('goal')} hint="Why you're taking it. Shown under the title.">{(p) => <textarea {...p} rows={2} value={cd.goal} onChange={(e) => setC('goal', e.target.value)} />}</Field>
            <div className="field span2">
              <label htmlFor="lc-prog">Progress <span className="num" style={{ color: '#4c1d95' }}>{cd.progress}%</span></label>
              <input id="lc-prog" className="range" type="range" min={0} max={100} step={1} value={cd.progress} onChange={(e) => setC('progress', Number(e.target.value))} />
            </div>
            <Field label="Started" error={cErr('start')}>{(p) => <input {...p} type="month" value={cd.start} onChange={(e) => setC('start', e.target.value)} />}</Field>
            <Field label="Target finish" error={cErr('target')} hint="Optional.">{(p) => <input {...p} type="month" value={cd.target} onChange={(e) => setC('target', e.target.value)} />}</Field>
            <div className="field span2">
              <span id="lc-st-l">Status</span>
              <Segmented
                aria-labelledby="lc-st-l"
                style={{ alignSelf: 'flex-start' }}
                value={cd.status}
                onChange={(v) => setCd((p) => (p ? { ...p, status: v, progress: v === 'completed' ? 100 : p.progress } : p))}
                options={[{ value: 'in_progress', label: 'In progress' }, { value: 'completed', label: 'Completed' }, { value: 'paused', label: 'Paused' }]}
              />
            </div>
            <Field label="Resources" span2 error={cErr('resources')} hint="Links or names, separated with commas.">{(p) => <input {...p} value={cd.resources} onChange={(e) => setC('resources', e.target.value)} />}</Field>
          </div>
        </Dialog>
      ) : null}

      {kind === 'skill' && sd ? (
        <Dialog
          title={editId === 'new' ? 'Add skill' : 'Edit skill'}
          sub="Advanced and Expert skills show under “Skills mastered” on About. Every skill is on the CV."
          maxWidth={560}
          onClose={close}
          saving={saving}
          onSubmit={() => {
            setTried(true)
            if (!sd.name.trim()) return
            saveSkill.mutate(sd)
          }}
          footer={
            <>
              {editId !== 'new' ? <button type="button" className="btn btn-neg first" onClick={() => setConfirming(true)}>Remove skill</button> : null}
              <button type="button" className="btn btn-line" onClick={close} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <><span className="spin" aria-hidden="true" />Saving</> : editId === 'new' ? 'Add' : 'Save changes'}</button>
            </>
          }
        >
          <div className="form" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <Field label="Skill" error={sErr('name')}>{(p) => <input {...p} value={sd.name} onChange={(e) => setS('name', e.target.value)} />}</Field>
            <Field label="Category" error={sErr('category')}>{(p) => <input {...p} value={sd.category} onChange={(e) => setS('category', e.target.value)} />}</Field>
            <div className="field">
              <span id="ls-lv-l">Level</span>
              <Segmented
                aria-labelledby="ls-lv-l"
                style={{ alignSelf: 'flex-start' }}
                value={sd.level}
                onChange={(v) => setS('level', v)}
                options={(['beginner', 'intermediate', 'advanced', 'expert'] as Level[]).map((l) => ({ value: l, label: cap(l) }))}
              />
            </div>
            <Field label="Description" error={sErr('description')} hint="Optional. One short line, like “4 years professionally”.">{(p) => <input {...p} value={sd.description} onChange={(e) => setS('description', e.target.value)} />}</Field>
          </div>
        </Dialog>
      ) : null}

      {confirming && kind && editId !== 'new' ? (
        kind === 'course' ? (
          <ConfirmDialog title={`Remove ${cd?.title}?`} description="It comes off the About and Learning pages. This can't be undone." confirmLabel="Remove course" busy={remove.isPending} onCancel={() => setConfirming(false)} onConfirm={() => remove.mutate()} />
        ) : (
          <ConfirmDialog title={`Remove ${sd?.name}?`} description="It comes off the Learning page and the CV." confirmLabel="Remove skill" busy={remove.isPending} onCancel={() => setConfirming(false)} onConfirm={() => remove.mutate()} />
        )
      ) : null}
    </>
  )
}
