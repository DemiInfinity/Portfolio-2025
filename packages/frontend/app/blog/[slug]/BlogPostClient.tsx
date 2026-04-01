'use client'

import { motion } from 'framer-motion'
import { Calendar, Clock, Tag, ArrowLeft, User } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { resolveMediaUrl } from '@/lib/mediaUrl'

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

interface BlogPostClientProps {
  slug: string
}

export default function BlogPostClient({ slug }: BlogPostClientProps) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadBlogPost = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
          ? `${process.env.NEXT_PUBLIC_API_URL}/api` 
          : 'https://api.demitaylornimmo.com/api'
        
        const response = await fetch(`${API_BASE_URL}/blog/${slug}`)
        const data = await response.json()
        
        if (data.success) {
          // Map backend data to frontend interface
          const mappedPost = {
            id: data.data.id,
            title: data.data.title,
            excerpt: data.data.excerpt,
            content: data.data.content || '',
            author: data.data.author || 'Admin',
            publishDate: data.data.publish_date || data.data.created_at,
            readTime: data.data.read_time || 5,
            category: data.data.category,
            tags: Array.isArray(data.data.tags) ? data.data.tags : [],
            featured: data.data.featured,
            slug: data.data.slug,
            coverImage: data.data.cover_image ?? null
          }
          setPost(mappedPost)
        } else {
          setError('Blog post not found')
        }
      } catch (error) {
        console.error('Failed to load blog post:', error)
        setError('Failed to load blog post')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      loadBlogPost()
    }
  }, [slug])

  const getCategoryColor = (category: string) => {
    const colors = {
      Frontend: 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800',
      Backend: 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800',
      Database: 'bg-gradient-to-r from-indigo-100 to-pink-100 text-indigo-800',
      DevOps: 'bg-gradient-to-r from-pink-100 to-rose-100 text-pink-800',
    }
    return colors[category as keyof typeof colors] || 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #f8f4ff 50%, #fff8f0 100%)' }}>
        <div className="text-lg font-medium text-gray-700">Loading blog post... ✨</div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #f8f4ff 50%, #fff8f0 100%)' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Blog post not found</h1>
          <p className="text-gray-600 mb-6">The blog post you're looking for doesn't exist or has been removed.</p>
          <Link
            href="/blog"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-lg hover:scale-105 transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-20" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #f8f4ff 50%, #fff8f0 100%)' }}>
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 text-4xl opacity-15 float-animation">📖</div>
        <div className="absolute top-40 right-20 text-3xl opacity-20 sparkle-animation">✨</div>
        <div className="absolute bottom-40 left-20 text-5xl opacity-10 float-animation">💭</div>
        <div className="absolute bottom-20 right-10 text-3xl opacity-15 sparkle-animation">💫</div>
        <div className="absolute top-1/2 left-1/4 text-3xl opacity-10">🌟</div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link
            href="/blog"
            className="inline-flex items-center text-pink-600 hover:text-purple-600 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog ✨
          </Link>
        </motion.div>

        {/* Article */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="card shadow-xl overflow-hidden"
        >
          {/* Hero / cover image */}
          <div className="relative h-64 md:h-80 bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-200 overflow-hidden">
            {post.coverImage && resolveMediaUrl(post.coverImage) ? (
              <img
                src={resolveMediaUrl(post.coverImage)}
                alt={post.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl opacity-50" aria-hidden>📝</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-8 md:p-12">
            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCategoryColor(post.category)}`}>
                {post.category}
              </span>
              <div className="flex items-center text-purple-600 text-sm font-medium">
                <Calendar className="w-4 h-4 mr-1" />
                {post.publishDate ? new Date(post.publishDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Date not available'}
              </div>
              <div className="flex items-center text-pink-600 text-sm font-medium">
                <Clock className="w-4 h-4 mr-1" />
                {post.readTime} min read
              </div>
              <div className="flex items-center text-gray-600 text-sm font-medium">
                <User className="w-4 h-4 mr-1" />
                {post.author}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
              {post.title}
            </h1>

            {/* Excerpt */}
            <p className="text-xl text-gray-700 mb-8 font-medium leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {post.excerpt}
            </p>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="tech-tag text-sm"
                  >
                    <Tag className="w-3 h-3" />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Content */}
            <div 
              className="prose prose-lg max-w-none text-gray-800 leading-relaxed markdown-content"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({children}) => <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-8">{children}</h1>,
                  h2: ({children}) => <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-6">{children}</h2>,
                  h3: ({children}) => <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-5">{children}</h3>,
                  p: ({children}) => <p className="mb-4 leading-relaxed">{children}</p>,
                  ul: ({children}) => <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>,
                  li: ({children}) => <li className="ml-4">{children}</li>,
                  blockquote: ({children}) => <blockquote className="border-l-4 border-pink-300 pl-4 italic text-gray-700 mb-4 bg-pink-50 py-2">{children}</blockquote>,
                  code: ({children}) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-pink-600">{children}</code>,
                  pre: ({children}) => <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
                  a: ({href, children}) => <a href={href} className="text-pink-600 hover:text-purple-600 underline font-medium">{children}</a>,
                  img: ({ src, alt }) => {
                    const resolved = src ? resolveMediaUrl(String(src)) : ''
                    if (!resolved) return null
                    return (
                      <img
                        src={resolved}
                        alt={alt ?? ''}
                        className="rounded-xl max-w-full h-auto my-6 shadow-md border border-pink-100"
                        loading="lazy"
                        decoding="async"
                      />
                    )
                  },
                  strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  em: ({children}) => <em className="italic text-gray-700">{children}</em>
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            {/* Divider */}
            <div className="border-t border-pink-200 my-12"></div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="text-gray-600 font-medium">
                Thanks for reading! ✨
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-lg hover:scale-105 transition-all"
              >
                More Posts
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </Link>
            </div>
          </div>
        </motion.article>
      </div>
    </div>
  )
}

