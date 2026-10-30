import { api } from './api'

export type Recommendation = {
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
}

export const RECS_KEY = ['recommendations'] as const

export const fetchRecs = async (): Promise<Recommendation[]> => {
  const res = await api.get('/recommendations')
  return (res.data?.data || []) as Recommendation[]
}

/** "{name} · {role} at {company}" with missing parts dropped. */
export const recLine = (r: Pick<Recommendation, 'name' | 'role' | 'company'>) => {
  const where = r.role && r.company ? `${r.role} at ${r.company}` : r.role || r.company || ''
  return [r.name, where].filter(Boolean).join(' · ')
}
