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

export default async function Learning() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : 'https://api.demitaylornimmo.com/api'

  const [data, skillsResponse] = await Promise.all([
    fetchLearning(),
    fetch(`${API_BASE_URL}/skills`, { cache: 'no-store' }),
  ])
  const currentLearning: LearningItem[] = data.map((item: any) => ({
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
    }
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
