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

export default async function Projects() {
  const projects = (await fetchProjects()) as Project[]
  return <ProjectsClient projects={projects} />
}
