import type { MetadataRoute } from 'next'

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://demitaylornimmo.com').replace(/\/$/, '')
  const apiBase = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
    : 'https://api.demitaylornimmo.com/api'

  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now },
    { url: `${siteUrl}/projects`, lastModified: now },
    { url: `${siteUrl}/blog`, lastModified: now },
    { url: `${siteUrl}/experience`, lastModified: now },
    { url: `${siteUrl}/learning`, lastModified: now },
  ]

  // Projects
  const projectsRes = await fetch(`${apiBase}/projects`, { cache: 'no-store' }).catch(() => null)
  const projectsJson = projectsRes ? await safeJson<{ data?: any[] }>(projectsRes) : null
  const projectRoutes: MetadataRoute.Sitemap =
    projectsJson?.data?.map((p) => ({
      url: `${siteUrl}/projects/${p.slug || p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
    })) || []

  // Blog posts
  const blogRes = await fetch(`${apiBase}/blog`, { cache: 'no-store' }).catch(() => null)
  const blogJson = blogRes ? await safeJson<{ data?: any[] }>(blogRes) : null
  const blogRoutes: MetadataRoute.Sitemap =
    blogJson?.data?.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.created_at ? new Date(post.created_at) : now,
    })) || []

  return [...staticRoutes, ...projectRoutes, ...blogRoutes]
}

