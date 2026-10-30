import { getServices } from '.'
import { isMissingTableError } from './siteContent'

export const RECOMMENDATION_COLUMNS =
  'id, quote, full_text, name, role, company, relationship, source, source_url, date, show_on_cv, sort_order, created_at, updated_at'

export interface Recommendation {
  id: number
  quote: string
  full_text: string | null
  name: string
  role: string | null
  company: string | null
  relationship: string | null
  source: string | null
  source_url: string | null
  date: string | null
  show_on_cv: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export function formatRecommendation(r: Record<string, any>): Recommendation {
  return {
    id: r.id,
    quote: r.quote ?? '',
    full_text: r.full_text ?? null,
    name: r.name ?? '',
    role: r.role ?? null,
    company: r.company ?? null,
    relationship: r.relationship ?? null,
    source: r.source ?? null,
    source_url: r.source_url ?? null,
    date: r.date ? String(r.date).slice(0, 10) : null,
    show_on_cv: Boolean(r.show_on_cv),
    sort_order: Number(r.sort_order ?? 0),
    created_at: r.created_at,
    updated_at: r.updated_at
  }
}

/** sort_order asc, then date desc (undated last), then id asc. */
export function sortRecommendations(list: Recommendation[]): Recommendation[] {
  return [...list].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    if (a.date !== b.date) {
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date < b.date ? 1 : -1
    }
    return a.id - b.id
  })
}

/** All recommendations in display order; [] before the v2 migration. */
export async function listRecommendations(): Promise<Recommendation[]> {
  const { data, error } = await getServices().supabaseService.getClient()
    .from('recommendations')
    .select(RECOMMENDATION_COLUMNS)
    .order('sort_order', { ascending: true })
  if (error) {
    if (isMissingTableError(error)) return []
    throw error
  }
  return sortRecommendations((data || []).map(formatRecommendation))
}
