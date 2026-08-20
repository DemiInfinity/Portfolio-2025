import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import BlogPostClient from './BlogPostClient'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { fetchBlogPostBySlug } from '@/lib/api'

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://demitaylornimmo.com'
  const url = `${siteUrl}/blog/${slug}`
  const title = `${post.title} | Blog`
  const description = post.excerpt || 'Read this blog post by Demi Taylor Nimmo'
  const author = post.author || 'Demi Taylor Nimmo'
  const ogImage = post.cover_image ? resolveMediaUrl(post.cover_image) : undefined

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
      publishedTime: post.publish_date || post.created_at,
      authors: [author],
      tags: post.tags ? (Array.isArray(post.tags) ? post.tags : JSON.parse(post.tags || '[]')) : [],
      ...(ogImage ? { images: [{ url: ogImage, alt: post.title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: '@demitaylornimmo',
      ...(ogImage ? { images: [ogImage] } : {}),
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

  return <BlogPostClient slug={slug} />
}
