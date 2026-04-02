import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import BlogPostClient from './BlogPostClient'
import { resolveMediaUrl } from '@/lib/mediaUrl'

interface PageProps {
  params: {
    slug: string
  }
}

async function getBlogPost(slug: string) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
      ? `${process.env.NEXT_PUBLIC_API_URL}/api` 
      : 'https://api.demitaylornimmo.com/api'
    
    const response = await fetch(`${API_BASE_URL}/blog/${slug}`, {
      next: { revalidate: 60 } // Revalidate every 60 seconds
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    return data.success ? data.data : null
  } catch (error) {
    console.error('Failed to fetch blog post:', error)
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await getBlogPost(params.slug)
  
  if (!post) {
    return {
      title: 'Blog Post Not Found | Blog',
      description: 'The blog post you are looking for does not exist.'
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://demitaylornimmo.com'
  const url = `${siteUrl}/blog/${params.slug}`
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
  const post = await getBlogPost(params.slug)
  
  if (!post) {
    notFound()
  }

  return <BlogPostClient slug={params.slug} />
}
