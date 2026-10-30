import type { Metadata } from 'next'
import RouteError from '@/components/RouteError'
import { loadOrUnavailable } from '@/lib/load'
import { ROUTE_ERRORS } from '@/lib/routeErrors'
import { fetchBlogPosts } from '@/lib/api'
import BlogClient from './blog-client'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Tutorials, architecture notes and lessons learned from building real applications.',
}

// The backend cold-starts when idle, so this page must render per-request
// (not be statically prerendered at build time) or a build-time backend
// hiccup would fail the whole deploy instead of showing error.tsx.
export const dynamic = 'force-dynamic'

export default async function Blog() {
  // H-14: ordered by publish_date, newest first. The API caps limit at 100.
  const loaded = await loadOrUnavailable(() => fetchBlogPosts({ limit: 100 }))
  if (!loaded.ok) return <RouteError {...ROUTE_ERRORS.blog} reference={loaded.reference} />
  const posts = loaded.data
  return <BlogClient posts={posts} />
}

