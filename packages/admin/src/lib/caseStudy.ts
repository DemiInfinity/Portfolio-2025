/** Structured case study (D-2, H-18): form <-> API mapping, limits and client validation. */

let seq = 0
export const key = () => `k${++seq}`

export type Phase = { _k: string; label: string; title: string; body: string; image: string; image_alt: string }
export type Step = { _k: string; title: string; detail: string }
export type Feature = { _k: string; title: string; body: string; image: string; image_alt: string }
export type Challenge = { _k: string; title: string; solution: string }
export type Metric = { _k: string; value: string; label: string }

export type CaseForm = {
  overview: string
  problem: string
  how_might_we: string
  process: Phase[]
  arch_summary: string
  steps: Step[]
  features: Feature[]
  challenges: Challenge[]
  metrics: Metric[]
  learned: string
}

export const LIMITS = {
  overview: 5000, problem: 5000, how_might_we: 300, learned: 5000, arch_summary: 3000,
  process: { max: 8, label: 30, title: 120, body: 3000, image_alt: 300 },
  steps: { max: 8, title: 80, detail: 200 },
  features: { max: 8, title: 120, body: 2000, image_alt: 300 },
  challenges: { max: 8, title: 120, solution: 2000 },
  metrics: { max: 6, value: 20, label: 80 },
} as const

export const newPhase = (): Phase => ({ _k: key(), label: '', title: '', body: '', image: '', image_alt: '' })
export const newStep = (): Step => ({ _k: key(), title: '', detail: '' })
export const newFeature = (): Feature => ({ _k: key(), title: '', body: '', image: '', image_alt: '' })
export const newChallenge = (): Challenge => ({ _k: key(), title: '', solution: '' })
export const newMetric = (): Metric => ({ _k: key(), value: '', label: '' })

export const emptyCase = (): CaseForm => ({ overview: '', problem: '', how_might_we: '', process: [], arch_summary: '', steps: [], features: [], challenges: [], metrics: [], learned: '' })

type Obj = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
const list = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : [])

export function toCaseForm(cs: unknown): CaseForm {
  if (!cs || typeof cs !== 'object') return emptyCase()
  const c = cs as Obj
  const arch = (c.architecture || {}) as Obj
  return {
    overview: str(c.overview),
    problem: str(c.problem),
    how_might_we: str(c.how_might_we),
    process: list(c.process).map((p) => ({ _k: key(), label: str(p.label), title: str(p.title), body: str(p.body), image: str(p.image), image_alt: str(p.image_alt) })),
    arch_summary: str(arch.summary),
    steps: list(arch.steps).map((s) => ({ _k: key(), title: str(s.title), detail: str(s.detail) })),
    features: list(c.features).map((f) => ({ _k: key(), title: str(f.title), body: str(f.body), image: str(f.image), image_alt: str(f.image_alt) })),
    challenges: list(c.challenges).map((x) => ({ _k: key(), title: str(x.title), solution: str(x.solution) })),
    metrics: list(c.metrics).map((m) => ({ _k: key(), value: str(m.value), label: str(m.label) })),
    learned: str(c.learned),
  }
}

/** Trimmed object without empty strings; undefined when nothing is left. */
const compact = (o: Record<string, string>) => {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(o)) if (v.trim()) out[k] = v.trim()
  return Object.keys(out).length ? out : undefined
}

export type IndexMap = Record<'process' | 'steps' | 'features' | 'challenges' | 'metrics', number[]>

/** Build the API value. Empty strings are omitted, items missing their required text are dropped, all-empty -> null. */
export function fromCaseForm(f: CaseForm): { value: Obj | null; index: IndexMap } {
  const index: IndexMap = { process: [], steps: [], features: [], challenges: [], metrics: [] }
  const keep = <T,>(items: T[], name: keyof IndexMap, ok: (t: T) => boolean, map: (t: T) => Obj | undefined) => {
    const out: Obj[] = []
    items.forEach((t, i) => {
      if (!ok(t)) return
      const m = map(t)
      if (!m) return
      index[name].push(i)
      out.push(m)
    })
    return out.length ? out : undefined
  }
  const v: Obj = {}
  const top = compact({ overview: f.overview, problem: f.problem, how_might_we: f.how_might_we, learned: f.learned })
  Object.assign(v, top || {})
  const process = keep(f.process, 'process', (p) => !!p.title.trim(), ({ _k: _, ...p }) => compact(p))
  if (process) v.process = process
  const steps = keep(f.steps, 'steps', (s) => !!s.title.trim(), ({ _k: _, ...s }) => compact(s))
  const summary = f.arch_summary.trim()
  if (summary || steps) v.architecture = { ...(summary ? { summary } : {}), ...(steps ? { steps } : {}) }
  const features = keep(f.features, 'features', (x) => !!x.title.trim(), ({ _k: _, ...x }) => compact(x))
  if (features) v.features = features
  const challenges = keep(f.challenges, 'challenges', (x) => !!x.title.trim(), ({ _k: _, ...x }) => compact(x))
  if (challenges) v.challenges = challenges
  const metrics = keep(f.metrics, 'metrics', (m) => !!m.value.trim() && !!m.label.trim(), ({ _k: _, ...m }) => compact(m))
  if (metrics) v.metrics = metrics
  return { value: Object.keys(v).length ? v : null, index }
}

export const tooLong = (max: number) => `Keep this under ${max} characters.`

/** Client errors keyed by form path, e.g. `overview`, `process.1.image_alt`, `metrics.0.value`. */
export function validateCase(f: CaseForm): Record<string, string> {
  const e: Record<string, string> = {}
  const cap = (path: string, v: string, max: number) => {
    if (v.trim().length > max) e[path] = tooLong(max)
  }
  cap('overview', f.overview, LIMITS.overview)
  cap('problem', f.problem, LIMITS.problem)
  cap('how_might_we', f.how_might_we, LIMITS.how_might_we)
  cap('learned', f.learned, LIMITS.learned)
  cap('arch_summary', f.arch_summary, LIMITS.arch_summary)
  const L = LIMITS
  f.process.forEach((p, i) => {
    cap(`process.${i}.label`, p.label, L.process.label)
    cap(`process.${i}.title`, p.title, L.process.title)
    cap(`process.${i}.body`, p.body, L.process.body)
    cap(`process.${i}.image_alt`, p.image_alt, L.process.image_alt)
    if (p.image.trim() && !p.image_alt.trim()) e[`process.${i}.image_alt`] = 'Describe the image.'
  })
  f.steps.forEach((s, i) => {
    cap(`steps.${i}.title`, s.title, L.steps.title)
    cap(`steps.${i}.detail`, s.detail, L.steps.detail)
  })
  f.features.forEach((x, i) => {
    cap(`features.${i}.title`, x.title, L.features.title)
    cap(`features.${i}.body`, x.body, L.features.body)
    cap(`features.${i}.image_alt`, x.image_alt, L.features.image_alt)
    if (x.image.trim() && !x.image_alt.trim()) e[`features.${i}.image_alt`] = 'Describe the image.'
  })
  f.challenges.forEach((x, i) => {
    cap(`challenges.${i}.title`, x.title, L.challenges.title)
    cap(`challenges.${i}.solution`, x.solution, L.challenges.solution)
  })
  f.metrics.forEach((m, i) => {
    cap(`metrics.${i}.value`, m.value, L.metrics.value)
    cap(`metrics.${i}.label`, m.label, L.metrics.label)
  })
  return e
}

/**
 * Server path (`case_study.process[1].title`, `case_study.architecture.steps[0].title`, `case_study.overview`)
 * -> form path, translating indices of the sent (compacted) arrays back to form rows.
 */
export function serverPathToForm(path: string, index: IndexMap): string | null {
  const p = path.replace(/^case_study\.?/, '')
  if (!p) return 'overview'
  let m = /^architecture\.summary$/.exec(p)
  if (m) return 'arch_summary'
  m = /^architecture\.steps\[(\d+)\](?:\.(\w+))?$/.exec(p)
  if (m) return `steps.${index.steps[Number(m[1])] ?? Number(m[1])}.${m[2] || 'title'}`
  m = /^(process|features|challenges|metrics)\[(\d+)\](?:\.(\w+))?$/.exec(p)
  if (m) {
    const name = m[1] as keyof IndexMap
    const field = m[3] || (name === 'metrics' ? 'value' : 'title')
    return `${name}.${index[name][Number(m[2])] ?? Number(m[2])}.${field}`
  }
  m = /^(overview|problem|how_might_we|learned)$/.exec(p)
  return m ? m[1] : 'overview'
}
