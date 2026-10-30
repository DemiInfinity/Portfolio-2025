import { FieldError } from './validation'

/**
 * Structured case study (H-18 / D-2). `normaliseCaseStudy` validates and
 * normalises the admin's input: trims strings, turns '' into "absent", drops
 * list items whose required text is empty, enforces lengths and list caps,
 * and rejects unknown keys or wrong types with dotted paths
 * (`case_study.process[1].title`).
 */

export interface CaseStudy {
  overview?: string
  problem?: string
  how_might_we?: string
  process?: { label?: string; title: string; body?: string; image?: string | null; image_alt?: string }[]
  architecture?: { summary?: string; steps?: { title: string; detail?: string }[] }
  features?: { title: string; body?: string; image?: string | null; image_alt?: string }[]
  challenges?: { title: string; solution?: string }[]
  metrics?: { value: string; label: string }[]
  learned?: string
}

type Spec =
  | { kind: 'text'; max: number }
  | { kind: 'url' }
  | { kind: 'object'; fields: Record<string, Spec> }
  | { kind: 'list'; max: number; item: Record<string, Spec>; required: string[] }

const text = (max: number): Spec => ({ kind: 'text', max })

const SPEC: Record<string, Spec> = {
  overview: text(5000),
  problem: text(5000),
  how_might_we: text(300),
  process: {
    kind: 'list',
    max: 8,
    required: ['title'],
    item: { label: text(30), title: text(120), body: text(3000), image: { kind: 'url' }, image_alt: text(300) }
  },
  architecture: {
    kind: 'object',
    fields: {
      summary: text(3000),
      steps: { kind: 'list', max: 8, required: ['title'], item: { title: text(80), detail: text(200) } }
    }
  },
  features: {
    kind: 'list',
    max: 8,
    required: ['title'],
    item: { title: text(120), body: text(2000), image: { kind: 'url' }, image_alt: text(300) }
  },
  challenges: { kind: 'list', max: 8, required: ['title'], item: { title: text(120), solution: text(2000) } },
  metrics: { kind: 'list', max: 6, required: ['value', 'label'], item: { value: text(20), label: text(80) } },
  learned: text(5000)
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** Returns the normalised value, or undefined when it is empty/absent. Pushes errors. */
function walk(spec: Spec, value: unknown, path: string, errors: FieldError[]): unknown {
  if (value === undefined || value === null) return undefined

  switch (spec.kind) {
    case 'text': {
      if (typeof value !== 'string') {
        errors.push({ path, msg: 'Must be text' })
        return undefined
      }
      const s = value.trim()
      if (s === '') return undefined
      if (s.length > spec.max) errors.push({ path, msg: `At most ${spec.max} characters` })
      return s
    }
    case 'url': {
      if (typeof value !== 'string') {
        errors.push({ path, msg: 'Must be a URL' })
        return undefined
      }
      const s = value.trim()
      if (s === '') return undefined
      if (!isHttpUrl(s)) errors.push({ path, msg: 'Must start with http:// or https://' })
      return s
    }
    case 'object': {
      if (!isPlainObject(value)) {
        errors.push({ path, msg: 'Must be an object' })
        return undefined
      }
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(value)) {
        if (!(key in spec.fields)) errors.push({ path: `${path}.${key}`, msg: 'Unknown field' })
      }
      for (const [key, sub] of Object.entries(spec.fields)) {
        const v = walk(sub, value[key], `${path}.${key}`, errors)
        if (v !== undefined) out[key] = v
      }
      return Object.keys(out).length ? out : undefined
    }
    case 'list': {
      if (!Array.isArray(value)) {
        errors.push({ path, msg: 'Must be a list' })
        return undefined
      }
      const items: Record<string, unknown>[] = []
      value.forEach((raw, i) => {
        const itemPath = `${path}[${i}]`
        if (!isPlainObject(raw)) {
          errors.push({ path: itemPath, msg: 'Must be an object' })
          return
        }
        for (const key of Object.keys(raw)) {
          if (!(key in spec.item)) errors.push({ path: `${itemPath}.${key}`, msg: 'Unknown field' })
        }
        const item: Record<string, unknown> = {}
        for (const [key, sub] of Object.entries(spec.item)) {
          const v = walk(sub, raw[key], `${itemPath}.${key}`, errors)
          if (v !== undefined) item[key] = v
        }
        // Items without their required text are dropped, not errors.
        if (spec.required.every((k) => typeof item[k] === 'string' && item[k] !== '')) {
          // `image` is null rather than absent when not set, as in the contract.
          if ('image' in spec.item && item.image === undefined) item.image = null
          items.push(item)
        }
      })
      if (items.length > spec.max) errors.push({ path, msg: `At most ${spec.max} items` })
      return items
    }
  }
}

/**
 * `null` (or undefined) → `{ value: null }` (no case study). Otherwise the
 * normalised object, or `errors` with dotted paths under `case_study`.
 */
export function normaliseCaseStudy(input: unknown): { value: CaseStudy | null; errors: FieldError[] } {
  const errors: FieldError[] = []
  if (input === null || input === undefined) return { value: null, errors }
  if (!isPlainObject(input)) {
    return { value: null, errors: [{ path: 'case_study', msg: 'Must be an object or null' }] }
  }
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(input)) {
    if (!(key in SPEC)) errors.push({ path: `case_study.${key}`, msg: 'Unknown field' })
  }
  for (const [key, spec] of Object.entries(SPEC)) {
    const v = walk(spec, input[key], `case_study.${key}`, errors)
    if (v !== undefined) out[key] = v
  }
  return { value: errors.length ? null : (out as CaseStudy), errors }
}

/** Reads a stored case study (JSONB, or a JSON string) safely. */
export function readCaseStudy(stored: unknown): CaseStudy | null {
  if (stored === null || stored === undefined || stored === '') return null
  if (typeof stored === 'string') {
    try {
      const parsed = JSON.parse(stored)
      return isPlainObject(parsed) ? (parsed as CaseStudy) : null
    } catch {
      return null
    }
  }
  return isPlainObject(stored) ? (stored as CaseStudy) : null
}

export function hasCaseStudy(cs: CaseStudy | null): boolean {
  return Boolean(cs && typeof cs.overview === 'string' && cs.overview.trim() !== '')
}

/** H-22: feature titles for list rows, in stored order, max 8. */
export function featureTitles(cs: CaseStudy | null): string[] {
  if (!cs || !Array.isArray(cs.features)) return []
  return cs.features
    .map((f) => (f && typeof f.title === 'string' ? f.title.trim() : ''))
    .filter(Boolean)
    .slice(0, 8)
}
