import type { Metadata } from 'next'
import { fetchProjects } from '@/lib/api'
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

export default async function Home() {
  const data = await fetchProjects()
  const projects = data.slice(0, 3) as Project[]

  return <HomeClient projects={projects} />
}
