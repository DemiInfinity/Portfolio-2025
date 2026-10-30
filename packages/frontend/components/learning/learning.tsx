import type { LearningItem, Skill } from '@/lib/api'
import { formatMonthYear } from '@/lib/format'
import { futureGoals } from '@/lib/content/site'

export function progressOf(item: Pick<LearningItem, 'progress'>): number {
  const n = Number(item.progress ?? 0)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0
}

/** "19%", or "Just started" under 5%. */
export function progressLabel(item: Pick<LearningItem, 'progress'>): string {
  const p = progressOf(item)
  return p < 5 ? 'Just started' : `${p}%`
}

/** "Udemy · Started April 2025 · Target December 2025", missing parts dropped. */
export function courseMeta(item: Pick<LearningItem, 'provider' | 'start_date' | 'estimated_completion'>): string {
  const started = formatMonthYear(item.start_date, true)
  const target = formatMonthYear(item.estimated_completion, true)
  return [item.provider?.trim(), started && `Started ${started}`, target && `Target ${target}`].filter(Boolean).join(' · ')
}

export const inProgress = (items: LearningItem[]) => items.filter((i) => i.status === 'in_progress')

export function masteredSkills(skills: Skill[]): Skill[] {
  return skills.filter((s) => ['advanced', 'expert'].includes(String(s.level || '').toLowerCase()))
}

export function ProgressBar({ item }: { item: Pick<LearningItem, 'progress'> }) {
  const p = progressOf(item)
  return (
    <div className="track" role="presentation">
      <span className="bar" style={{ width: `${p}%` }} />
    </div>
  )
}

/** Course card from About's learning modal. */
export function CourseCard({ item, label }: { item: LearningItem; label?: string }) {
  const meta = courseMeta(item)
  return (
    <div className="ab-course">
      <div className="course-top">
        <div>
          <p style={{ fontWeight: 600, lineHeight: 1.4 }}>{item.title}</p>
          {(meta || label) && <p className="course-meta">{[label, meta].filter(Boolean).join(' · ')}</p>}
        </div>
        <span className="course-pct">{progressOf(item)}%</span>
      </div>
      <ProgressBar item={item} />
      {item.description && <p className="course-goal">Goal: {item.description}</p>}
    </div>
  )
}

export function SkillsMastered({ skills }: { skills: Skill[] }) {
  return (
    <div className="ab-course" style={{ background: '#f5efff' }}>
      <p style={{ fontWeight: 600, color: 'var(--b2)' }}>Skills mastered</p>
      <ul style={{ listStyle: 'none', padding: 0, fontSize: 'var(--t-meta)', lineHeight: 1.7 }}>
        {skills.map((s) => (
          <li key={s.id ?? s.name}>
            <strong>{s.name}</strong>
            {s.level ? `, ${String(s.level).toLowerCase()}` : ''}
            {s.description ? `: ${s.description}` : ''}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function FutureGoals() {
  return (
    <div className="ab-course" style={{ background: '#fdf2fb' }}>
      <p style={{ fontWeight: 600, color: '#9d174d' }}>Future goals</p>
      <ul style={{ listStyle: 'none', padding: 0, fontSize: 'var(--t-meta)', lineHeight: 1.7 }}>
        {futureGoals.map((g) => (
          <li key={g}>{g}</li>
        ))}
      </ul>
    </div>
  )
}
