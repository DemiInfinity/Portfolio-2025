import type { CaseStudy } from '@/lib/api'

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const list = <T,>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : [])

export type NormalisedCaseStudy = {
  overview: string
  problem: string
  howMightWe: string
  process: { label: string; title: string; body: string; image: string; imageAlt: string }[]
  architecture: { summary: string; steps: { title: string; detail: string }[] }
  features: { title: string; body: string; image: string; imageAlt: string }[]
  challenges: { title: string; solution: string }[]
  metrics: { value: string; label: string }[]
  learned: string
}

/** Trims every field and drops list items without their required text (H-18 rules, applied defensively). */
export function normaliseCaseStudy(cs: CaseStudy | null | undefined): NormalisedCaseStudy | null {
  if (!cs || typeof cs !== 'object') return null
  const out: NormalisedCaseStudy = {
    overview: text(cs.overview),
    problem: text(cs.problem),
    howMightWe: text(cs.how_might_we),
    process: list(cs.process)
      .map((p) => ({ label: text(p?.label) || text(p?.title), title: text(p?.title), body: text(p?.body), image: text(p?.image), imageAlt: text(p?.image_alt) }))
      .filter((p) => p.title),
    architecture: {
      summary: text(cs.architecture?.summary),
      steps: list(cs.architecture?.steps)
        .map((s) => ({ title: text(s?.title), detail: text(s?.detail) }))
        .filter((s) => s.title),
    },
    features: list(cs.features)
      .map((f) => ({ title: text(f?.title), body: text(f?.body), image: text(f?.image), imageAlt: text(f?.image_alt) }))
      .filter((f) => f.title),
    challenges: list(cs.challenges)
      .map((c) => ({ title: text(c?.title), solution: text(c?.solution) }))
      .filter((c) => c.title),
    metrics: list(cs.metrics)
      .map((m) => ({ value: text(m?.value), label: text(m?.label) }))
      .filter((m) => m.value && m.label),
    learned: text(cs.learned),
  }
  const empty =
    !out.overview && !out.problem && !out.howMightWe && !out.process.length && !out.architecture.summary &&
    !out.architecture.steps.length && !out.features.length && !out.challenges.length && !out.metrics.length && !out.learned
  return empty ? null : out
}

export const SECTION_ORDER = [
  { id: 'overview', label: 'Overview' },
  { id: 'problem', label: 'The problem' },
  { id: 'process', label: 'Process' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'features', label: 'Key features' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'outcome', label: 'Outcome' },
] as const

/** TOC entries for the sections that have content, in the fixed order. */
export function caseStudyToc(cs: NormalisedCaseStudy): { id: string; label: string }[] {
  const has: Record<string, boolean> = {
    overview: Boolean(cs.overview),
    problem: Boolean(cs.problem || cs.howMightWe),
    process: cs.process.length > 0,
    architecture: Boolean(cs.architecture.summary || cs.architecture.steps.length),
    features: cs.features.length > 0,
    challenges: cs.challenges.length > 0,
    outcome: cs.metrics.length > 0 || Boolean(cs.learned),
  }
  return SECTION_ORDER.filter((s) => has[s.id]).map((s) => ({ id: s.id, label: s.label }))
}
