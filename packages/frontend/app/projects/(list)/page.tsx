import type { Metadata } from 'next'
import RouteError from '@/components/RouteError'
import { loadOrUnavailable } from '@/lib/load'
import { ROUTE_ERRORS } from '@/lib/routeErrors'
import { fetchProjects } from '@/lib/api'
import ProjectsClient from './projects-client'

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Things Demi Taylor Nimmo has designed and built end to end, from the database to the last sparkle.',
}

// The backend cold-starts when idle, so this page must render per-request
// (not be statically prerendered at build time) or a build-time backend
// hiccup would fail the whole deploy instead of showing error.tsx.
export const dynamic = 'force-dynamic'

export default async function Projects() {
  // H-19: the API returns only public projects, in display order.
  const loaded = await loadOrUnavailable(fetchProjects)
  if (!loaded.ok) return <RouteError {...ROUTE_ERRORS.projects} reference={loaded.reference} />
  const projects = loaded.data
  return <ProjectsClient projects={projects} />
}

