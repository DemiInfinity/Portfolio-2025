import type { Metadata } from 'next'
import RouteError from '@/components/RouteError'
import { loadOrUnavailable } from '@/lib/load'
import { ROUTE_ERRORS } from '@/lib/routeErrors'
import { notFound, redirect } from 'next/navigation'
import ProjectDetailsClient from '../project-details-client'
import { fetchProjectById, fetchProjectBySlug, fetchProjects } from '@/lib/api'
import type { Project } from '@/lib/api'
import { nextProject } from '@/lib/selectors'
import { DEFAULT_OG_IMAGE, siteUrl } from '@/lib/siteUrl'
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
  const loaded = await loadOrUnavailable(() => (/^\d+$/.test(slug) ? fetchProjectById(slug) : fetchProjectBySlug(slug)))
  if (!loaded.ok) return { title: 'Projects' }
  const project = loaded.data
  if (!project) return { title: 'Project Not Found | Projects' }

  const title = `${project.title} | Projects`
  const description = project.description || undefined
  const url = siteUrl(`/projects/${project.slug || slug}`)
  // LinkedIn builds its preview from og:image; fall back to the site default (1200×630).
  const image = project.image ? resolveMediaUrl(project.image) : siteUrl(DEFAULT_OG_IMAGE)
  const imageMeta = project.image
    ? { url: image, alt: project.title }
    : { url: image, alt: 'Demi Taylor Nimmo, full-stack software engineer', width: 1200, height: 630 }

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
      url,
      siteName: 'Demi Taylor Nimmo',
      images: [imageMeta],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
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
    const loadedById = await loadOrUnavailable(() => fetchProjectById(slug))
    if (!loadedById.ok) return <RouteError {...ROUTE_ERRORS.projects} reference={loadedById.reference} />
    const byId = loadedById.data
    if (!byId) notFound()
    if (byId.slug) redirect(`/projects/${byId.slug}`)
    return <ProjectDetailsClient project={byId} next={await loadNext(byId.slug)} url={siteUrl(`/projects/${slug}`)} />
  }

  const loaded = await loadOrUnavailable(() => fetchProjectBySlug(slug))
  if (!loaded.ok) return <RouteError {...ROUTE_ERRORS.projects} reference={loaded.reference} />
  const project = loaded.data
  if (!project) notFound()

  const canonical = siteUrl(`/projects/${project.slug || slug}`)

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
      <ProjectDetailsClient project={project} next={await loadNext(project.slug || slug)} url={canonical} />
    </>
  )
}

