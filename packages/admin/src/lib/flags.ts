import { useQuery } from '@tanstack/react-query'
import { api } from './api'

export type FeatureFlag = { id: number; name: string; description: string | null; enabled: boolean; created_at?: string; updated_at?: string }

export const FLAGS_KEY = ['feature-flags'] as const

export const KNOWN_FLAGS: Record<string, string> = {
  maintenance_mode: 'Maintenance mode',
  open_to_work: 'Open to work badge',
  show_marbl: 'List Marbl',
}

/** Known label, otherwise the key humanised: `show_reviews` -> "Show reviews". */
export const flagLabel = (name: string) =>
  KNOWN_FLAGS[name] || name.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

export const fetchFlags = async (): Promise<FeatureFlag[]> => {
  const res = await api.get('/feature-flags')
  return (res.data?.data || []) as FeatureFlag[]
}

export const useFlags = () => useQuery({ queryKey: FLAGS_KEY, queryFn: fetchFlags })

export const isOn = (flags: FeatureFlag[] | undefined, name: string) => !!flags?.find((f) => f.name === name)?.enabled
