'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Github, ExternalLink, Calendar, ArrowRight } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import Link from 'next/link'

interface Project {
  id: number
  slug?: string
  title: string
  description: string
  image?: string
  technologies?: string[] | string
  github_url?: string
  live_url?: string
  date?: string | null
  featured: boolean
  status?: 'in_development' | 'ideas' | 'completed'
}

function projectTechnologies(project: Project): string[] {
  const t = project.technologies
  if (Array.isArray(t)) return t
  if (typeof t === 'string') {
    try {
      if (t.startsWith('[')) return JSON.parse(t) as string[]
      return t.split(',').map((s) => s.trim()).filter(Boolean)
    } catch {
      return []
    }
  }
  return []
}

const formatProjectDate = (dateString?: string | null) => {
  if (!dateString || typeof dateString !== 'string') return '—'
  const ymd = dateString.slice(0, 10)
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10))
  if (!y || !m || !d) return '—'
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ProjectsClient({ projects }: { projects: Project[] }) {
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'in_development' | 'ideas' | 'completed'>('All')

  if (projects.length === 0) {
    return (
      <div className="min-h-screen py-20" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #f8f4ff 50%, #fff8f0 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
            <h1 className="text-5xl sm:text-6xl font-bold gradient-text mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>💼 Projects</h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-medium mb-12">No projects available at the moment. Check back soon! ✨</p>
          </motion.div>
        </div>
      </div>
    )
  }

  const featuredProjects = projects.filter(project => project.featured)
  const otherProjects = projects.filter(project => !project.featured)

  const statusLabel = (status?: Project['status']) => {
    switch (status) {
      case 'in_development': return '🚧 In Development'
      case 'ideas': return '💡 Ideas'
      case 'completed': return '✅ Completed'
      default: return '🚧 In Development'
    }
  }

  const statusBadgeClass = (status?: Project['status']) => {
    switch (status) {
      case 'completed': return 'bg-gradient-to-r from-green-100 to-emerald-100 text-emerald-800'
      case 'ideas': return 'bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800'
      default: return 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800'
    }
  }

  const matchesStatus = (p: Project) => selectedStatus === 'All' || (p.status || 'in_development') === selectedStatus
  const filteredFeatured = featuredProjects.filter(matchesStatus)
  const filteredOther = otherProjects.filter(matchesStatus)

  return (
    <div className="min-h-screen py-20" style={{ background: 'linear-gradient(135deg, #f8f4ff 0%, #fff8f0 50%, #ffb3ba 100%)' }}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 text-4xl opacity-15 float-animation">💻</div>
        <div className="absolute top-40 right-20 text-3xl opacity-20 sparkle-animation">✨</div>
        <div className="absolute bottom-40 left-20 text-5xl opacity-10 float-animation">🚀</div>
        <div className="absolute bottom-20 right-10 text-3xl opacity-15 sparkle-animation">💫</div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl font-bold gradient-text mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>✨ My Projects</h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto font-medium">A beautiful collection of projects showcasing my skills in full-stack development, from concept to deployment. 💖</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="flex flex-wrap gap-2 justify-center mb-12">
          {([
            { id: 'All', label: 'All ✨' },
            { id: 'in_development', label: '🚧 In Development' },
            { id: 'ideas', label: '💡 Ideas' },
            { id: 'completed', label: '✅ Completed' },
          ] as const).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedStatus(opt.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 ${
                selectedStatus === opt.id
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-pink-100 hover:to-purple-100 hover:text-pink-700 border border-pink-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </motion.div>

        {filteredFeatured.length > 0 && (
          <section className="mb-20">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="text-4xl font-bold gradient-text mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>
              💎 Featured Projects
            </motion.h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredFeatured.map((project, index) => (
                <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }} className="card hover:scale-105 transition-transform">
                  <div className="relative h-64 bg-gradient-to-br from-pink-200 to-purple-300 overflow-hidden">
                    {project.image && resolveMediaUrl(project.image) ? <img src={resolveMediaUrl(project.image)} alt={project.title} className="absolute inset-0 w-full h-full object-cover" /> : null}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-2xl font-semibold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>{project.title}</h3>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusBadgeClass(project.status)}`}>{statusLabel(project.status)}</span>
                    </div>
                    <p className="text-gray-600 mb-4 font-medium">{project.description}</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {projectTechnologies(project).map((tech) => (
                        <span key={tech} className="tech-tag">{tech}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-purple-600 text-sm font-medium"><Calendar className="w-4 h-4 mr-1" />{formatProjectDate(project.date)}</div>
                      <div className="flex items-center space-x-3">
                        <Link href={`/projects/${project.slug || project.id}`} className="p-2 bg-white/80 hover:bg-pink-100 rounded-full transition-colors" aria-label={`View details for ${project.title}`}>
                          <ArrowRight className="w-5 h-5 text-gray-600 hover:text-pink-600" />
                        </Link>
                        {project.github_url && <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 hover:bg-pink-100 rounded-full transition-colors"><Github className="w-5 h-5 text-gray-600 hover:text-pink-600" /></a>}
                        {project.live_url && <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 hover:bg-pink-100 rounded-full transition-colors"><ExternalLink className="w-5 h-5 text-gray-600 hover:text-pink-600" /></a>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {filteredOther.length > 0 && (
          <section>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="text-4xl font-bold gradient-text mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>
              🌟 Other Projects
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredOther.map((project, index) => (
                <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }} className="card hover:scale-105 transition-transform">
                  <div className="relative h-48 bg-gradient-to-br from-pink-100 to-purple-100 overflow-hidden">
                    {project.image && resolveMediaUrl(project.image) ? <img src={resolveMediaUrl(project.image)} alt={project.title} className="absolute inset-0 w-full h-full object-cover" /> : null}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>{project.title}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadgeClass(project.status)}`}>{statusLabel(project.status)}</span>
                      </div>
                      <div className="flex items-center text-pink-600 text-sm font-medium"><Calendar className="w-4 h-4 mr-1" />{formatProjectDate(project.date)}</div>
                    </div>
                    <p className="text-gray-600 mb-4 text-sm font-medium">{project.description}</p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {(() => {
                        const techs = projectTechnologies(project)
                        return (
                          <>
                            {techs.slice(0, 3).map((tech) => (
                              <span key={tech} className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs font-medium">{tech}</span>
                            ))}
                            {techs.length > 3 && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded text-xs font-medium">+{techs.length - 3} more</span>
                            )}
                          </>
                        )
                      })()}
                    </div>
                    <div className="flex space-x-3">
                      <Link href={`/projects/${project.slug || project.id}`} className="btn-secondary text-xs px-3 py-1">Details ✨</Link>
                      {project.github_url && <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs px-3 py-1"><Github className="w-3 h-3 mr-1" />Code 💻</a>}
                      {project.live_url && <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs px-3 py-1"><ExternalLink className="w-3 h-3 mr-1" />Demo ✨</a>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {filteredFeatured.length === 0 && filteredOther.length === 0 ? (
          <div className="text-center py-10"><p className="text-gray-700 font-medium">No projects found for that status. ✨</p></div>
        ) : null}
      </div>
    </div>
  )
}

