import type { Metadata } from 'next'
import { fetchProjects } from '@/lib/api'
import ProjectsClient from './projects-client'

interface Project {
  id: number
  slug?: string
  title: string
  description: string
  image?: string
  technologies: string[]
  github_url?: string
  live_url?: string
  date: string
  featured: boolean
  status?: 'in_development' | 'ideas' | 'completed'
}

export const metadata: Metadata = {
  title: 'Projects',
}

// The backend cold-starts when idle, so this page must render per-request
// (not be statically prerendered at build time) or a build-time backend
// hiccup would fail the whole deploy instead of showing error.tsx.
export const dynamic = 'force-dynamic'

export default async function Projects() {
  const projects = (await fetchProjects()) as Project[]
  return <ProjectsClient projects={projects} />
}
