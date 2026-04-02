'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Calendar, ExternalLink, Github, Image as ImageIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { resolveMediaUrl } from '@/lib/mediaUrl'

type Project = {
  id: number
  title: string
  description: string
  image?: string | null
  images?: string[]
  technologies?: string[]
  github_url?: string | null
  live_url?: string | null
  date?: string | null
  featured?: boolean
  inspiration?: string | null
  content?: string | null
}

function formatProjectDate(dateString: string) {
  const [year, month, day] = dateString.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function ProjectDetailsClient({ project }: { project: Project }) {
  const hero = project.image ? resolveMediaUrl(project.image) : ''
  const gallery = Array.isArray(project.images) ? project.images : []

  return (
    <div
      className="min-h-screen py-20"
      style={{ background: 'linear-gradient(135deg, #f8f4ff 0%, #fff8f0 50%, #ffb3ba 100%)' }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 text-4xl opacity-15 float-animation">💻</div>
        <div className="absolute top-40 right-20 text-3xl opacity-20 sparkle-animation">✨</div>
        <div className="absolute bottom-40 left-20 text-5xl opacity-10 float-animation">🚀</div>
        <div className="absolute bottom-20 right-10 text-3xl opacity-15 sparkle-animation">💫</div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <Link
            href="/projects"
            className="inline-flex items-center text-pink-600 hover:text-purple-600 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Link>
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="card shadow-xl overflow-hidden"
        >
          <div className="relative h-64 md:h-80 bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-200 overflow-hidden">
            {hero ? (
              <img src={hero} alt={project.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl opacity-50" aria-hidden>
                  🎨
                </span>
              </div>
            )}
          </div>

          <div className="p-8 md:p-12">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {project.date ? (
                <div className="flex items-center text-purple-600 text-sm font-medium">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatProjectDate(project.date)}
                </div>
              ) : null}

              <div className="flex gap-3">
                {project.github_url ? (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 hover:bg-white rounded-lg border border-pink-200 text-gray-800 font-semibold transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    Code
                  </a>
                ) : null}
                {project.live_url ? (
                  <a
                    href={project.live_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:scale-105 transition-transform"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Live
                  </a>
                ) : null}
              </div>
            </div>

            <h1
              className="text-4xl md:text-5xl font-bold gradient-text mb-4"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              {project.title}
            </h1>

            <p className="text-xl text-gray-700 mb-8 font-medium leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {project.description}
            </p>

            {Array.isArray(project.technologies) && project.technologies.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-10">
                {project.technologies.map((tech) => (
                  <span key={tech} className="tech-tag">
                    {tech}
                  </span>
                ))}
              </div>
            ) : null}

            {/* Gallery first */}
            {gallery.length > 0 ? (
              <div className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Gallery
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {gallery.map((src, idx) => {
                    const resolved = resolveMediaUrl(src)
                    return (
                      <div
                        key={`${src}-${idx}`}
                        className="relative rounded-2xl overflow-hidden border border-pink-100 bg-white/60"
                      >
                        {resolved ? (
                          <img
                            src={resolved}
                            alt={`${project.title} screenshot ${idx + 1}`}
                            className="w-full h-56 object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="h-56 flex items-center justify-center text-gray-500">
                            <ImageIcon className="w-6 h-6 mr-2" />
                            Image
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {/* Then long-form description (markdown) */}
            {project.content ? (
              <div className="text-gray-800 leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Project Description
                </h2>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-8" style={{ fontFamily: 'Playfair Display, serif' }}>
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-7" style={{ fontFamily: 'Playfair Display, serif' }}>
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>,
                    li: ({ children }) => <li className="ml-4">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-pink-300 pl-4 italic text-gray-700 mb-4 bg-pink-50 py-2 rounded-r-lg">
                        {children}
                      </blockquote>
                    ),
                    code: ({ children, className }) => {
                      const isBlock = typeof className === 'string' && className.includes('language-')
                      if (isBlock) return <code className="text-sm font-mono">{children}</code>
                      return (
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-pink-600">
                          {children}
                        </code>
                      )
                    },
                    pre: ({ children }) => (
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6 border border-gray-800">
                        {children}
                      </pre>
                    ),
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
                    a: ({ href, children }) => (
                      <a href={href} className="text-pink-600 hover:text-purple-600 underline font-medium">
                        {children}
                      </a>
                    ),
                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                  }}
                >
                  {project.content}
                </ReactMarkdown>
              </div>
            ) : null}

            {/* Then inspiration (markdown) */}
            {project.inspiration ? (
              <div className="mt-12">
                <h2 className="text-2xl font-semibold text-gray-800 mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Inspiration
                </h2>
                <div className="text-gray-800 leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>,
                      li: ({ children }) => <li className="ml-4">{children}</li>,
                      a: ({ href, children }) => (
                        <a href={href} className="text-pink-600 hover:text-purple-600 underline font-medium">
                          {children}
                        </a>
                      ),
                      strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                    }}
                  >
                    {project.inspiration}
                  </ReactMarkdown>
                </div>
              </div>
            ) : null}
          </div>
        </motion.article>
      </div>
    </div>
  )
}

