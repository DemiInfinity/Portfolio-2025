import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProjectDetailsClient from './project-details-client'
import { fetchProjectById } from '@/lib/api'

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const project = await fetchProjectById(params.id)
  if (!project) {
    return { title: 'Project Not Found' }
  }
  return {
    title: `${project.title} | Projects`,
    description: project.description || undefined,
  }
}

export default async function ProjectDetailsPage({ params }: PageProps) {
  const project = await fetchProjectById(params.id)
  if (!project) notFound()
  return <ProjectDetailsClient project={project} />
}

