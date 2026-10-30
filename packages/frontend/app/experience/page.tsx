import type { Metadata } from 'next'
import { fetchEducation, fetchWorkHistory } from '@/lib/api'
import ExperienceClient from './experience-client'

export const metadata: Metadata = {
  title: 'Experience',
  description: 'Five years of full-stack work, from legacy .NET to micro-frontends, serverless and component libraries.',
}

// The backend cold-starts when idle, so this page must render per-request
// (not be statically prerendered at build time) or a build-time backend
// hiccup would fail the whole deploy instead of showing error.tsx.
export const dynamic = 'force-dynamic'

/** Current role first, then newest start date first. */
function byNewest<T extends { start_date: string; end_date?: string | null }>(a: T, b: T) {
  const aCurrent = a.end_date ? 0 : 1
  const bCurrent = b.end_date ? 0 : 1
  if (aCurrent !== bCurrent) return bCurrent - aCurrent
  return String(b.start_date).localeCompare(String(a.start_date))
}

export default async function Experience() {
  const [roles, education] = await Promise.all([fetchWorkHistory(), fetchEducation()])
  return <ExperienceClient roles={[...roles].sort(byNewest)} education={education} />
}

