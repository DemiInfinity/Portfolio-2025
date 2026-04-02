import type { Metadata } from 'next'
import { fetchWorkHistory, fetchEducation, fetchCertifications } from '@/lib/api'
import ExperienceClient from './experience-client'

interface WorkExperience {
  id: number
  company: string
  position: string
  location: string
  start_date: string
  end_date: string | null
  description: string
  achievements: string[]
  technologies: string[]
  company_url?: string
}

interface Education {
  id: number
  institution: string
  degree: string
  field_of_study?: string
  location: string
  start_date: string
  end_date: string | null
  grade?: string
  description: string
  achievements: string[]
}

interface Certification {
  id: number
  name: string
  issuer: string
  issue_date: string
  expiry_date: string | null
  credential_id?: string
  credential_url?: string
  description: string
  skills: string[]
}

export const metadata: Metadata = {
  title: 'Experience',
}

export default async function WorkHistory() {
  const [workExperience, education, certifications] = await Promise.all([
    fetchWorkHistory(),
    fetchEducation(),
    fetchCertifications(),
  ])

  return (
    <ExperienceClient
      workExperience={workExperience as WorkExperience[]}
      education={education as Education[]}
      certifications={certifications as Certification[]}
    />
  )
}
