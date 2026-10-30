import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import ProjectDetailsClient from '../project-details-client'
import { fetchProjectById, fetchProjectBySlug, fetchProjects } from '@/lib/api'
import type { Project } from '@/lib/api'
import { nextProject } from '@/lib/selectors'
import { resolveMediaUrl } from '@/lib/mediaUrl'

interface PageProps {
  params: Promise<{ slug: string }>
}

// fetchProjectById/fetchProjectBySlug use no-store, and there's no
// generateStaticParams here, but force this explicitly for the same reason
// as the other data-fetching pages: never let a build-time backend hiccup
// turn into a hard build failure instead of a graceful error.tsx.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const project = /^\d+$/.test(slug) ? await fetchProjectById(slug) : await fetchProjectBySlug(slug)
  if (!project) return { title: 'Project Not Found | Projects' }

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

/** "Next project" in `GET /api/projects` order; the band is simply left out if the list can't load. */
async function loadNext(slug: string): Promise<Project | null> {
  try {
    return nextProject(await fetchProjects(), slug)
  } catch (error) {
    // Next control-flow errors carry a digest and must propagate.
    if ((error as { digest?: unknown } | null)?.digest) throw error
    console.error('Case study: project list unavailable for Next project', error)
    return null
  }
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params

  // Backwards compatibility: allow /projects/:id and redirect to /projects/:slug
  if (/^\d+$/.test(slug)) {
    const byId = await fetchProjectById(slug)
    if (!byId) notFound()
    if (byId.slug) redirect(`/projects/${byId.slug}`)
    return <ProjectDetailsClient project={byId} next={await loadNext(byId.slug)} />
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProjectDetailsClient project={project} next={await loadNext(project.slug || slug)} />
    </>
  )
}

