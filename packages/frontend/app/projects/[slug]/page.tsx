import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import ProjectDetailsClient from '../project-details-client'
import { fetchProjectById, fetchProjectBySlug } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/mediaUrl'

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params.slug
  const project = /^\d+$/.test(slug) ? await fetchProjectById(slug) : await fetchProjectBySlug(slug)
  if (!project) return { title: 'Project Not Found' }

  const title = `${project.title} | Projects`
  const description = project.description || undefined
  const image = project.image ? resolveMediaUrl(project.image) : undefined

  return {
    title,
    description,
    alternates: {
      canonical: `/projects/${project.slug || slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      ...(image ? { images: [{ url: image, alt: project.title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function ProjectPage({ params }: PageProps) {
  const slug = params.slug

  // Backwards compatibility: allow /projects/:id and redirect to /projects/:slug
  if (/^\d+$/.test(slug)) {
    const byId = await fetchProjectById(slug)
    if (!byId) notFound()
    if (byId.slug) redirect(`/projects/${byId.slug}`)
    return <ProjectDetailsClient project={byId} />
  }

  const project = await fetchProjectBySlug(slug)
  if (!project) notFound()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://demitaylornimmo.com'
  const canonical = `${siteUrl.replace(/\/$/, '')}/projects/${project.slug || slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: project.title,
    description: project.description,
    url: canonical,
    ...(project.technologies?.length ? { applicationCategory: 'WebApplication' } : {}),
    ...(project.live_url ? { sameAs: [project.live_url] } : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProjectDetailsClient project={project} />
    </>
  )
}

