import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import BlogPostClient from './BlogPostClient'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { fetchBlogPostBySlug, fetchBlogPosts } from '@/lib/api'
import type { BlogPost } from '@/lib/api'
import { keepReading } from '@/lib/selectors'
import { DEFAULT_OG_IMAGE, siteUrl } from '@/lib/siteUrl'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

// This relied on ISR (fetchBlogPostBySlug used revalidate: 60) instead of
// being forced dynamic like every other data page on the site. That let a
// bad/transient fetch result get cached and served as a false 404 to every
// visitor regardless of the real slug's validity - reproduced directly: the
// backend API returned the post correctly via curl while this route kept
// 404ing. Force dynamic rendering so it is never served from a stale cache.
export const dynamic = 'force-dynamic'

// Note: throws ApiUnavailableError (caught by the nearest error.tsx) if the
// backend can't be reached, and only returns null for a genuine 404 - so a
// sleeping/cold-starting backend no longer looks like a missing blog post.
async function getBlogPost(slug: string) {
  return fetchBlogPostBySlug(slug)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPost(slug)

  if (!post) {
    return {
      title: 'Blog Post Not Found | Blog',
      description: 'The blog post you are looking for does not exist.'
    }
  }

  const url = siteUrl(`/blog/${post.slug || slug}`)
  const title = `${post.title} | Blog`
  const description = post.excerpt || 'Read this blog post by Demi Taylor Nimmo'
  const author = post.author || 'Demi Taylor Nimmo'
  // LinkedIn builds its preview from og:image; fall back to the site default (1200×630).
  const ogImage = post.cover_image ? resolveMediaUrl(post.cover_image) : siteUrl(DEFAULT_OG_IMAGE)
  const ogImageMeta = post.cover_image
    ? { url: ogImage, alt: post.title }
    : { url: ogImage, alt: 'Demi Taylor Nimmo, full-stack software engineer', width: 1200, height: 630 }

  return {
    title,
    description,
    authors: [{ name: author }],
    keywords: post.tags ? (Array.isArray(post.tags) ? post.tags : JSON.parse(post.tags || '[]')) : [],
    openGraph: {
      title,
      description,
      url,
      siteName: 'Demi Taylor Nimmo',
      type: 'article',
      publishedTime: post.publish_date || post.created_at || undefined,
      authors: [author],
      tags: post.tags ? (Array.isArray(post.tags) ? post.tags : JSON.parse(post.tags || '[]')) : [],
      images: [ogImageMeta],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: '@demitaylornimmo',
      images: [ogImage],
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await getBlogPost(slug)

  if (!post) {
    notFound()
  }

  const others = await loadOthers()
  return <BlogPostClient post={post} url={siteUrl(`/blog/${post.slug || slug}`)} keepReading={keepReading(others, post)} />
}

/** "Keep reading" is optional: a failed list just hides it. */
async function loadOthers(): Promise<BlogPost[]> {
  try {
    return await fetchBlogPosts({ limit: 100 })
  } catch (error) {
    if ((error as { digest?: unknown } | null)?.digest) throw error
    console.error('Post: list unavailable for Keep reading', error)
    return []
  }
}
