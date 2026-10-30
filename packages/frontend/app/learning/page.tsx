import type { Metadata } from 'next'
import { fetchLearning, fetchSkills } from '@/lib/api'
import type { Skill } from '@/lib/api'
import LearningClient from './learning-client'

export const metadata: Metadata = {
  title: 'Learning',
  description: 'The courses Demi Taylor Nimmo is working through, the skills mastered so far and what’s next.',
}

// The backend cold-starts when idle, so this page must render per-request
// (not be statically prerendered at build time) or a build-time backend
// hiccup would fail the whole deploy instead of showing error.tsx.
export const dynamic = 'force-dynamic'

export default async function Learning() {
  // Courses are the page's core (a failure goes to error.tsx); skills degrade to a note.
  const learning = await fetchLearning()
  let skills: Skill[] | null = null
  try {
    skills = await fetchSkills()
  } catch (error) {
    if ((error as { digest?: unknown } | null)?.digest) throw error
    console.error('Learning: skills unavailable', error)
  }
  return <LearningClient learning={learning} skills={skills} />
}
