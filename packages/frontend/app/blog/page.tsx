import type { Metadata } from 'next'
import { fetchBlogPosts } from '@/lib/api'
import BlogClient from './blog-client'

interface BlogPost {
  id: number
  title: string
  excerpt: string
  content: string
  author: string
  publishDate: string
  readTime: number
  category: string
  tags: string[]
  featured: boolean
  slug: string
  coverImage?: string | null
}

export const metadata: Metadata = {
  title: 'Blog',
}

export default async function Blog() {
  const data = await fetchBlogPosts()
  const blogPosts: BlogPost[] = data.map((post: any) => ({
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content || '',
    author: post.author || 'Admin',
    publishDate: post.publish_date || post.created_at,
    readTime: post.read_time || 5,
    category: post.category,
    tags: Array.isArray(post.tags) ? post.tags : [],
    featured: post.featured,
    slug: post.slug,
    coverImage: post.cover_image ?? null,
  }))

  return <BlogClient blogPosts={blogPosts} />
}
