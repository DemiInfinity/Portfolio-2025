import { useQuery } from '@tanstack/react-query'
import { api } from './api'

export type FeatureFlag = { id: number; name: string; description: string | null; enabled: boolean; created_at?: string; updated_at?: string }

export const FLAGS_KEY = ['feature-flags'] as const

export const KNOWN_FLAGS: Record<string, string> = {
  maintenance_mode: 'Maintenance mode',
  open_to_work: 'Open to work badge',
  show_marbl: 'List Marbl',
  show_colourways: 'Colour switcher',
}

/** Descriptions for known flags, used when the API row has none and as the default for a new flag with that key. */
export const KNOWN_DESCRIPTIONS: Record<string, string> = {
  maintenance_mode: 'Shows every visitor the maintenance page instead of the site.',
  open_to_work: 'The Open to work badge beside your name on the home page.',
  show_marbl: 'Includes Marbl in the apps the Privacy and Terms pages cover.',
  show_colourways: 'Lets visitors switch the home page between the Lilac, Rose and Moonlight colourways.',
}

/** Flags the server seeds and refuses to delete (H-8). `show_colourways` is known but owner-created, so it can be deleted. */
export const BUILT_IN_FLAGS = new Set(['maintenance_mode', 'open_to_work', 'show_marbl'])

export const flagDescription = (f: { name: string; description: string | null }) => f.description || KNOWN_DESCRIPTIONS[f.name] || ''

/** Known label, otherwise the key humanised: `show_reviews` -> "Show reviews". */
export const flagLabel = (name: string) =>
  KNOWN_FLAGS[name] || name.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

export const fetchFlags = async (): Promise<FeatureFlag[]> => {
  const res = await api.get('/feature-flags')
  return (res.data?.data || []) as FeatureFlag[]
}

export const useFlags = () => useQuery({ queryKey: FLAGS_KEY, queryFn: fetchFlags })

export const isOn = (flags: FeatureFlag[] | undefined, name: string) => !!flags?.find((f) => f.name === name)?.enabled
