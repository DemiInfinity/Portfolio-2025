import type { CSSProperties } from 'react'
import Spark from '@/components/ui/Spark'
import { CourseCard, FutureGoals } from '@/components/learning/learning'
import type { LearningItem, Skill } from '@/lib/api'

const H2: CSSProperties = { fontSize: 'clamp(30px, 2.8vw, 40px)' }

function groupSkills(skills: Skill[]): { category: string; items: Skill[] }[] {
  const map = new Map<string, Skill[]>()
  for (const skill of skills) {
    const category = skill.category?.trim() || 'Other'
    map.set(category, [...(map.get(category) ?? []), skill])
  }
  return Array.from(map, ([category, items]) => ({ category, items }))
}

function Courses({ title, items, paused }: { title: string; items: LearningItem[]; paused?: boolean }) {
  if (!items.length) return null
  return (
    <section className="wrap" style={{ paddingTop: 72, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <h2 className="serif sv" style={H2}>{title}</h2>
      <div className="grid-2" style={{ gap: 14 }}>
        {items.map((item) => (
          <CourseCard key={item.id ?? item.title} item={item} label={paused && item.status === 'paused' ? 'Paused' : undefined} />
        ))}
      </div>
    </section>
  )
}

/** Learning (no design board): the page hero pattern plus About's learning components. */
export default function LearningClient({ learning, skills }: { learning: LearningItem[]; skills: Skill[] | null }) {
  const active = learning.filter((i) => i.status === 'in_progress' || i.status === 'paused')
  const completed = learning.filter((i) => i.status === 'completed')
  return (
    <>
      <div className="under-header" style={{ background: 'linear-gradient(160deg, #f8f4ff 0%, #fff8f0 55%, #efe4ff 100%)' }}>
        <section className="wrap" style={{ paddingTop: 90, paddingBottom: 80, position: 'relative' }}>
          <Spark className="twinkle" style={{ ['--d' as string]: '.3s', position: 'absolute', right: '10%', top: 60, width: 30, height: 30, color: 'var(--c1)' } as CSSProperties} />
          <h1 className="serif in" style={{ fontSize: 'clamp(52px, 6.4vw, 96px)', lineHeight: 1.05 }}>
            My learning{' '}
            <span className="script grad-text" style={{ fontSize: '1.15em', color: 'var(--c2)', paddingRight: '.1em' }}>
              journey
            </span>
          </h1>
          <p className="in" style={{ ['--d' as string]: '200ms', marginTop: 18, fontSize: 'var(--t-lead)', lineHeight: 1.6, maxWidth: '50ch' } as CSSProperties}>
            The courses I’m working through, the skills I’ve picked up and what I want to learn next.
          </p>
        </section>
      </div>

      {active.length === 0 && completed.length === 0 && (
        <section className="wrap" style={{ paddingTop: 72 }}>
          <p style={{ fontSize: 'var(--t-lead)' }}>No courses yet. Check back soon.</p>
        </section>
      )}
      <Courses title="In progress" items={active} paused />
      <Courses title="Completed" items={completed} />

      <section className="wrap" style={{ paddingTop: 72, paddingBottom: 120, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <h2 className="serif sv" style={H2}>Skills mastered</h2>
        {skills === null ? (
          <p role="note" style={{ fontSize: 'var(--t-meta)' }}>
            {"Sorry, I couldn't load skills right now. The server may still be waking up; refresh in a few seconds."}
          </p>
        ) : skills.length === 0 ? (
          <p style={{ fontSize: 'var(--t-meta)' }}>Skills are on their way.</p>
        ) : (
          <div className="grid-3" style={{ gap: 14 }}>
            {groupSkills(skills).map((group) => (
              <div key={group.category} className="ab-course" style={{ background: '#f5efff' }}>
                <p style={{ fontWeight: 600, color: 'var(--b2)' }}>{group.category}</p>
                <ul style={{ listStyle: 'none', padding: 0, fontSize: 'var(--t-meta)', lineHeight: 1.7 }}>
                  {group.items.map((s) => (
                    <li key={s.id ?? s.name}>
                      <strong>{s.name}</strong>
                      {s.level ? `, ${String(s.level).toLowerCase()}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <div style={{ maxWidth: 520 }}>
          <FutureGoals />
        </div>
      </section>
    </>
  )
}
