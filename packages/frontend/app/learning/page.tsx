import type { Metadata } from 'next'
import { fetchLearning, ApiUnavailableError } from '@/lib/api'
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

export default async function Learning() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : 'https://api.demitaylornimmo.com/api'

  let skillsResponse: Response
  let learningData: any[]
  try {
    ;[learningData, skillsResponse] = await Promise.all([
      // Throws ApiUnavailableError on failure - let it bubble to error.tsx.
      fetchLearning(),
      fetch(`${API_BASE_URL}/skills`, { cache: 'no-store' }),
    ])
  } catch (error) {
    if (error instanceof ApiUnavailableError) throw error
    throw new ApiUnavailableError('Unable to reach the API to load skills.', { cause: error })
  }

  if (!skillsResponse.ok) {
    throw new ApiUnavailableError(
      `The API returned an error while loading skills (status ${skillsResponse.status}).`
    )
  }

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
      learningGoals={learningGoals}
    />
  )
}
