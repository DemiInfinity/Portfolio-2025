import { api } from './api'
import { toArray } from './format'

export type ProjectStatus = 'in_development' | 'ideas' | 'completed'
export interface Project {
  id: number
  title: string
  slug?: string
  description?: string
  image?: string | null
  images: string[]
  status?: ProjectStatus
  technologies: string[]
  github_url?: string | null
  live_url?: string | null
  date?: string | null
  featured: boolean
  inspiration?: string | null
  role?: string | null
  platform?: string | null
  show_on_site?: boolean
  has_case_study?: boolean
  content?: string | null
  case_study?: unknown
}

export const PROJECTS_KEY = ['projects'] as const

const norm = (p: Project): Project => ({ ...p, technologies: toArray(p.technologies), images: toArray(p.images), featured: !!p.featured })

/** H-19: the admin reads every project from the admin endpoints, never the public ones. */
export const fetchProjects = async (): Promise<Project[]> => {
  const res = await api.get('/projects/admin/all')
  return ((res.data?.data || []) as Project[]).map(norm)
}
export const fetchProject = async (id: number): Promise<Project> => {
  const res = await api.get(`/projects/admin/${id}`)
  return norm(res.data.data as Project)
}

/** Public on the site: shown and not an idea (H-19 rule). */
export const isPublic = (p: Project) => p.show_on_site !== false && p.status !== 'ideas'
