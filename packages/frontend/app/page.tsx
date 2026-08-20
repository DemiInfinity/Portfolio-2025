import type { Metadata } from 'next'
import { fetchProjects, ApiUnavailableError } from '@/lib/api'
import HomeClient from './home-client'

interface Project {
  id: number
  title: string
  description: string
  image?: string
  technologies: string[]
  github_url?: string
  live_url?: string
  date: string
  featured: boolean
}

export const metadata: Metadata = {
  title: 'Home | Demi Taylor Nimmo',
}

// The backend cold-starts when idle, so this page must render per-request
// (not be statically prerendered at build time) or a build-time backend
// hiccup would fail the whole deploy instead of showing error.tsx.
export const dynamic = 'force-dynamic'

export default async function Home() {
  // The "Recent Work" widget on the homepage shouldn't take the whole
  // landing page down if the backend (Railway, cold-starts when idle) is
  // unreachable - the hero, about and CTA sections should still render.
  // So this failure is caught here rather than left to bubble to an
  // error.tsx boundary, and surfaced as a visible inline state instead.
  let projects: Project[] = []
  let projectsUnavailable = false
  try {
    const data = await fetchProjects()
    projects = data.slice(0, 3) as Project[]
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      console.error('Home: projects unavailable', error)
      projectsUnavailable = true
    } else {
      throw error
    }
  }

  return <HomeClient projects={projects} projectsUnavailable={projectsUnavailable} />
}
