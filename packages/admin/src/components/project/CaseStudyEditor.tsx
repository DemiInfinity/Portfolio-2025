import type { ReactNode } from 'react'
import { LIMITS, newChallenge, newFeature, newMetric, newPhase, newStep, type CaseForm, type Feature, type Phase } from '@/lib/caseStudy'
import LimitField from '@/components/ui/LimitField'
import RepeatList from '@/components/ui/RepeatList'
import Field from '@/components/ui/Field'
import { ImageUploadButton } from '@/components/ImageUploadButton'

type Props = {
  value: CaseForm
  onChange: (v: CaseForm) => void
  errors: Record<string, string>
  legacy?: { content: string; onChange: (v: string) => void } | null
}

const filled = (o: object) => Object.entries(o).some(([k, v]) => k !== '_k' && typeof v === 'string' && v.trim())

function Section({ title, line, children }: { title: string; line?: string; children: ReactNode }) {
  return (
    <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h3>
        {line ? <p className="mute" style={{ fontSize: 13 }}>{line}</p> : null}
      </div>
      {children}
    </section>
  )
}

function ImageFields<T extends Phase | Feature>({ item, update, err, base, altMax }: { item: T; update: (p: Partial<T>) => void; err: (p: string) => string | undefined; base: string; altMax: number }) {
  return (
    <>
      <Field label="Image" span2 error={err(`${base}.image`)}>
        {(p) => (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {item.image ? <img className="thumb" src={item.image} alt="" style={{ width: 88, height: 60 }} /> : null}
            <div className="joined" style={{ flex: 1, minWidth: 0 }}>
              <input {...p} placeholder="https://" value={item.image} onChange={(e) => update({ image: e.target.value } as Partial<T>)} />
              <ImageUploadButton onUploaded={(url) => update({ image: url } as Partial<T>)} />
            </div>
          </div>
        )}
      </Field>
      <LimitField span2 label="Image description" max={altMax} value={item.image_alt} onChange={(v) => update({ image_alt: v } as Partial<T>)} error={err(`${base}.image_alt`)} hint="For screen readers. Required when there is an image." />
    </>
  )
}

export default function CaseStudyEditor({ value: v, onChange, errors, legacy }: Props) {
  const set = <K extends keyof CaseForm>(k: K, x: CaseForm[K]) => onChange({ ...v, [k]: x })
  const err = (p: string) => errors[p]
  const L = LIMITS
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="Overview" line="What it is and who it's for.">
        <LimitField label="Overview" multiline rows={5} max={L.overview} value={v.overview} onChange={(x) => set('overview', x)} error={err('overview')} hint="The case study only appears on the site once this is filled in." />
      </Section>
      <Section title="The problem" line="What was wrong before. Markdown works.">
        <LimitField label="The problem" multiline rows={4} max={L.problem} value={v.problem} onChange={(x) => set('problem', x)} error={err('problem')} />
        <LimitField label="How might we" placeholder="How might we…" max={L.how_might_we} value={v.how_might_we} onChange={(x) => set('how_might_we', x)} error={err('how_might_we')} />
      </Section>
      <Section title="Process phases" line="Shown as tabs, in this order.">
        <RepeatList kind="Phase" items={v.process} onChange={(x) => set('process', x)} make={newPhase} max={L.process.max} hasText={filled}>
          {(p, i, up) => (
            <div className="form">
              <LimitField label="Label" placeholder="Discover" max={L.process.label} value={p.label} onChange={(x) => up({ label: x })} error={err(`process.${i}.label`)} />
              <LimitField label="Title" max={L.process.title} value={p.title} onChange={(x) => up({ title: x })} error={err(`process.${i}.title`)} />
              <LimitField span2 label="Body" multiline rows={4} max={L.process.body} value={p.body} onChange={(x) => up({ body: x })} error={err(`process.${i}.body`)} />
              <ImageFields item={p} update={up} err={err} base={`process.${i}`} altMax={L.process.image_alt} />
            </div>
          )}
        </RepeatList>
      </Section>
      <Section title="Architecture" line="Shown in order, as a flow.">
        <LimitField label="Summary" multiline rows={3} max={L.arch_summary} value={v.arch_summary} onChange={(x) => set('arch_summary', x)} error={err('arch_summary')} />
        <RepeatList kind="Step" items={v.steps} onChange={(x) => set('steps', x)} make={newStep} max={L.steps.max} hasText={filled}>
          {(s, i, up) => (
            <div className="form">
              <LimitField label="Title" max={L.steps.title} value={s.title} onChange={(x) => up({ title: x })} error={err(`steps.${i}.title`)} />
              <LimitField label="Detail" max={L.steps.detail} value={s.detail} onChange={(x) => up({ detail: x })} error={err(`steps.${i}.detail`)} />
            </div>
          )}
        </RepeatList>
      </Section>
      <Section title="Features">
        <RepeatList kind="Feature" items={v.features} onChange={(x) => set('features', x)} make={newFeature} max={L.features.max} hasText={filled}>
          {(f, i, up) => (
            <div className="form">
              <LimitField span2 label="Title" max={L.features.title} value={f.title} onChange={(x) => up({ title: x })} error={err(`features.${i}.title`)} />
              <LimitField span2 label="Body" multiline rows={3} max={L.features.body} value={f.body} onChange={(x) => up({ body: x })} error={err(`features.${i}.body`)} />
              <ImageFields item={f} update={up} err={err} base={`features.${i}`} altMax={L.features.image_alt} />
            </div>
          )}
        </RepeatList>
      </Section>
      <Section title="Challenges">
        <RepeatList kind="Challenge" items={v.challenges} onChange={(x) => set('challenges', x)} make={newChallenge} max={L.challenges.max} hasText={filled}>
          {(c, i, up) => (
            <div className="form" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
              <LimitField label="Challenge" max={L.challenges.title} value={c.title} onChange={(x) => up({ title: x })} error={err(`challenges.${i}.title`)} />
              <LimitField label="How you solved it" multiline rows={3} max={L.challenges.solution} value={c.solution} onChange={(x) => up({ solution: x })} error={err(`challenges.${i}.solution`)} />
            </div>
          )}
        </RepeatList>
      </Section>
      <Section title="Metrics" line="The outcome, number first.">
        <RepeatList kind="Metric" items={v.metrics} onChange={(x) => set('metrics', x)} make={newMetric} max={L.metrics.max} hasText={filled}>
          {(m, i, up) => (
            <div className="form">
              <LimitField label="Value" placeholder="30%" max={L.metrics.value} value={m.value} onChange={(x) => up({ value: x })} error={err(`metrics.${i}.value`)} />
              <LimitField label="Label" placeholder="lower infrastructure costs" max={L.metrics.label} value={m.label} onChange={(x) => up({ label: x })} error={err(`metrics.${i}.label`)} />
            </div>
          )}
        </RepeatList>
      </Section>
      <Section title="What I learned">
        <LimitField label="What I learned" multiline rows={4} max={L.learned} value={v.learned} onChange={(x) => set('learned', x)} error={err('learned')} />
      </Section>
      {legacy ? (
        <details className="panel">
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Old Markdown case study</summary>
          <div style={{ marginTop: 12 }}>
            <Field label="Markdown" hint="Kept for reference. Not shown on the site once Overview is filled in." controlClass="code">
              {(p) => <textarea {...p} value={legacy.content} onChange={(e) => legacy.onChange(e.target.value)} />}
            </Field>
          </div>
        </details>
      ) : null}
    </div>
  )
}
