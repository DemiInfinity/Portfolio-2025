import type { Metadata } from 'next'
import { fetchLearning } from '@/lib/api'
import LearningClient from './learning-client'

interface LearningItem {
  id: number
  title: string
  description: string
  progress?: number
  category: string
  startDate?: string
  estimatedCompletion?: string
  completedDate?: string
  level?: string
  resources?: string[]
}

export const metadata: Metadata = {
  title: 'Learning',
}

// The backend cold-starts when idle, so this page must render per-request
// (not be statically prerendered at build time) or a build-time backend
// hiccup would fail the whole deploy instead of showing error.tsx.
export const dynamic = 'force-dynamic'

export default async function Learning() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : 'https://api.demitaylornimmo.com/api'

  // The main learning items are the page's core content - a failure there
  // should bubble to error.tsx. Completed skills are a secondary section,
  // so a failure there degrades gracefully instead of blanking the page.
  const learningData = await fetchLearning()

  const currentLearning: LearningItem[] = learningData.map((item: any) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    progress: item.progress,
    category: item.category,
    startDate: item.start_date,
    estimatedCompletion: item.estimated_completion,
    resources: item.resources || [],
  }))

  let completedSkills: LearningItem[] = []
  let skillsUnavailable = false
  try {
    const skillsResponse = await fetch(`${API_BASE_URL}/skills`, { cache: 'no-store' })
    if (skillsResponse.ok) {
      const skillsData = await skillsResponse.json()
      if (skillsData.success && Array.isArray(skillsData.data)) {
        completedSkills = skillsData.data.map((skill: any) => ({
          id: skill.id,
          title: skill.name,
          description: skill.description || '',
          category: skill.category,
          level: skill.level,
          completedDate: skill.completed_date || null,
        }))
      } else {
        skillsUnavailable = true
      }
    } else {
      skillsUnavailable = true
    }
  } catch (error) {
    console.error('Error fetching skills:', error)
    skillsUnavailable = true
  }

  const learningGoals = [
    'Master Advanced React Patterns',
    'Learn Machine Learning Fundamentals',
    'Explore Web3 Development',
    'Improve System Design Skills',
  ]

  return (
    <LearningClient
      currentLearning={currentLearning}
      completedSkills={completedSkills}
      skillsUnavailable={skillsUnavailable}
      learningGoals={learningGoals}
    />
  )
}
