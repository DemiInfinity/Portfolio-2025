import type { Metadata } from 'next'
import { fetchEducation, fetchProjects, fetchWorkHistory, ApiUnavailableError } from '@/lib/api'
import type { Project } from '@/lib/api'
import { degreeStat, pickRecentWork, yearsStat } from '@/lib/selectors'
import { homeTeaser } from '@/lib/content/site'
import HomeClient from './home-client'
import type { HomeStats } from './home-client'

export const metadata: Metadata = {
  title: 'Home',
}

// The backend cold-starts when idle, so this page must render per-request
// (not be statically prerendered at build time) or a build-time backend
// hiccup would fail the whole deploy instead of showing error.tsx.
export const dynamic = 'force-dynamic'

/** Optional stats: any failure falls back to the content module values. */
async function loadStats(): Promise<HomeStats> {
  const [work, education] = await Promise.allSettled([fetchWorkHistory(), fetchEducation()])
  const years = work.status === 'fulfilled' ? yearsStat(work.value) : null
  const degree = education.status === 'fulfilled' && education.value[0] ? degreeStat(education.value[0]) : null
  return {
    years: years ?? homeTeaser.yearsStat,
    degree: degree ?? { value: homeTeaser.degreeStat, label: homeTeaser.degreeLabel },
  }
}

export default async function Home() {
  // "Recent work" shouldn't take the whole landing page down if the backend
  // (cold-starts when idle) is unreachable - the hero, about and contact
  // sections should still render. So this failure is caught here rather
  // than left to bubble to an error.tsx boundary, and surfaced inline.
  let projects: Project[] = []
  let projectsUnavailable = false
  const statsPromise = loadStats()
  try {
    // H-19: the API already returns only public projects.
    projects = pickRecentWork(await fetchProjects())
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      console.error('Home: projects unavailable', error)
      projectsUnavailable = true
    } else {
      throw error
    }
  }

  return <HomeClient projects={projects} projectsUnavailable={projectsUnavailable} stats={await statsPromise} />
}
