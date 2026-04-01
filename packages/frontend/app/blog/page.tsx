'use client'

import { motion } from 'framer-motion'
import { Calendar, Clock, Tag, ArrowRight, Search } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
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

export default function Blog() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBlogPosts = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
          ? `${process.env.NEXT_PUBLIC_API_URL}/api` 
          : 'https://api.demitaylornimmo.com/api'
        
        const response = await fetch(`${API_BASE_URL}/blog`)
        const data = await response.json()
        
        if (data.success) {
          // Map backend data to frontend interface
          const mappedPosts = data.data.map((post: any) => ({
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
            coverImage: post.cover_image ?? null
          }))
          setBlogPosts(mappedPosts)
        }
      } catch (error) {
        console.error('Failed to load blog posts:', error)
      } finally {
        setLoading(false)
      }
    }

    loadBlogPosts()
  }, [])

  // Extract unique categories from blog posts dynamically
  const uniqueCategories = Array.from(new Set(blogPosts.map(post => post.category).filter(Boolean)))
  const categories = ['All', ...uniqueCategories.sort()]

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const featuredPosts = filteredPosts.filter(post => post.featured)
  const regularPosts = filteredPosts.filter(post => !post.featured)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #f8f4ff 50%, #fff8f0 100%)' }}>
        <div className="text-lg font-medium text-gray-700">Loading blog posts... ✨</div>
      </div>
    )
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      Frontend: 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800',
      Backend: 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800',
      Database: 'bg-gradient-to-r from-indigo-100 to-pink-100 text-indigo-800',
      DevOps: 'bg-gradient-to-r from-pink-100 to-rose-100 text-pink-800',
    }
    return colors[category as keyof typeof colors] || 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800'
  }

  return (
    <div className="min-h-screen py-20" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #f8f4ff 50%, #fff8f0 100%)' }}>
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 text-4xl opacity-15 float-animation">📝</div>
        <div className="absolute top-40 right-20 text-3xl opacity-20 sparkle-animation">✨</div>
        <div className="absolute bottom-40 left-20 text-5xl opacity-10 float-animation">💭</div>
        <div className="absolute bottom-20 right-10 text-3xl opacity-15 sparkle-animation">💫</div>
        <div className="absolute top-1/2 left-1/4 text-3xl opacity-10">🌟</div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl sm:text-6xl font-bold gradient-text mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
            📝 Blog
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto font-medium">
            Thoughts, tutorials, and insights about software development,
            technology trends, and lessons learned from building applications! ✨
          </p>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search posts... ✨"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-pink-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-colors font-medium"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-pink-100 hover:to-purple-100 hover:text-pink-700 border border-pink-200'
                  }`}
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <section className="mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-4xl font-bold gradient-text mb-8" style={{ fontFamily: 'Playfair Display, serif' }}
            >
              ⭐ Featured Posts
            </motion.h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {featuredPosts.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="card shadow-lg hover:shadow-xl hover:scale-105 transition-all overflow-hidden"
                >
                  <div className="relative h-48 bg-gradient-to-br from-pink-200 to-purple-300 overflow-hidden">
                    {post.coverImage && resolveMediaUrl(post.coverImage) ? (
                      <img
                        src={resolveMediaUrl(post.coverImage)}
                        alt={post.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCategoryColor(post.category)}`}>
                        {post.category}
                      </span>
                      <div className="flex items-center text-pink-600 text-sm font-medium">
                        <Clock className="w-4 h-4 mr-1" />
                        {post.readTime} min read
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-800 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {post.title}
                    </h3>
                    
                    <p className="text-gray-600 mb-4 font-medium">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="tech-tag text-xs"
                        >
                          <Tag className="w-3 h-3" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-purple-600 text-sm font-medium">
                        <Calendar className="w-4 h-4 mr-1" />
                        {post.publishDate ? new Date(post.publishDate).toLocaleDateString() : 'Date not available'}
                      </div>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="inline-flex items-center text-pink-600 hover:text-purple-600 font-semibold transition-colors"
                      >
                        Read More ✨
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        )}

        {/* Regular Posts */}
        {regularPosts.length > 0 && (
          <section>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-4xl font-bold gradient-text mb-8" style={{ fontFamily: 'Playfair Display, serif' }}
            >
              📚 {featuredPosts.length > 0 ? 'More Posts' : 'All Posts'}
            </motion.h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="card shadow-md hover:shadow-lg hover:scale-105 transition-all overflow-hidden"
                >
                  <div className="relative h-40 bg-gradient-to-br from-pink-100 to-purple-200 overflow-hidden">
                    {post.coverImage && resolveMediaUrl(post.coverImage) ? (
                      <img
                        src={resolveMediaUrl(post.coverImage)}
                        alt={post.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getCategoryColor(post.category)}`}>
                        {post.category}
                      </span>
                      <div className="flex items-center text-pink-600 text-xs font-medium">
                        <Clock className="w-3 h-3 mr-1" />
                        {post.readTime} min
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {post.title}
                    </h3>
                    
                    <p className="text-gray-600 mb-3 text-sm line-clamp-3 font-medium">
                      {post.excerpt}
                    </p>
                    
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="tech-tag text-xs"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            <span>{tag}</span>
                          </span>
                        ))}
                        {post.tags.length > 3 && (
                          <span className="tech-tag text-xs">
                            <Tag className="w-2.5 h-2.5" />
                            <span>+{post.tags.length - 3}</span>
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-purple-600 text-xs font-medium">
                        <Calendar className="w-3 h-3 mr-1" />
                        {post.publishDate ? new Date(post.publishDate).toLocaleDateString() : 'Date not available'}
                      </div>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="inline-flex items-center text-pink-600 hover:text-purple-600 text-sm font-semibold transition-colors"
                      >
                        Read ✨
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        )}

        {/* No Results */}
        {filteredPosts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-12 h-12 text-pink-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              No posts found 😔
            </h3>
            <p className="text-gray-600 font-medium">
              Try adjusting your search terms or category filter! ✨
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
