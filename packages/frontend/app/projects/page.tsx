'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Github, ExternalLink, Calendar, Tag } from 'lucide-react'
import { fetchProjects } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/mediaUrl'

interface Project {
  id: number
  title: string
  description: string
  image?: string
  technologies: string[]
  github_url?: string
  live_url?: string
  date: string
  featured: boolean
  status?: 'active' | 'on_hold' | 'completed'
}

// Format project date from YYYY-MM-DD to Month Day, Year
const formatProjectDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await fetchProjects()
        setProjects(data)
      } catch (error) {
        console.error('Failed to load projects:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading projects...</div>
      </div>
    )
  }

  // Show empty state if no projects
  if (projects.length === 0) {
    return (
      <div className="min-h-screen py-20" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #f8f4ff 50%, #fff8f0 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-5xl sm:text-6xl font-bold gradient-text mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
              💼 Projects
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-medium mb-12">
              No projects available at the moment. Check back soon! ✨
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  const featuredProjects = projects.filter(project => project.featured)
  const otherProjects = projects.filter(project => !project.featured)

  return (
    <div className="min-h-screen py-20" style={{ background: 'linear-gradient(135deg, #f8f4ff 0%, #fff8f0 50%, #ffb3ba 100%)' }}>
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 text-4xl opacity-15 float-animation">💻</div>
        <div className="absolute top-40 right-20 text-3xl opacity-20 sparkle-animation">✨</div>
        <div className="absolute bottom-40 left-20 text-5xl opacity-10 float-animation">🚀</div>
        <div className="absolute bottom-20 right-10 text-3xl opacity-15 sparkle-animation">💫</div>
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
            ✨ My Projects
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto font-medium">
            A beautiful collection of projects showcasing my skills in full-stack development,
            from concept to deployment. 💖
          </p>
        </motion.div>

        {/* Featured Projects */}
        <section className="mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-4xl font-bold gradient-text mb-8" style={{ fontFamily: 'Playfair Display, serif' }}
          >
            💎 Featured Projects
          </motion.h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {featuredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card hover:scale-105 transition-transform"
              >
                <div className="relative h-64 bg-gradient-to-br from-pink-200 to-purple-300 overflow-hidden">
                  {project.image && resolveMediaUrl(project.image) ? (
                    <img
                      src={resolveMediaUrl(project.image)}
                      alt={project.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-semibold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {project.title}
                    </h3>
                    {project.status === 'on_hold' && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        On Hold
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-4 font-medium">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.technologies.map((tech) => (
                      <span key={tech} className="tech-tag">
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-purple-600 text-sm font-medium">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatProjectDate(project.date)}
                    </div>
                    <div className="flex space-x-3">
                      {project.github_url && (
                        <a
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-100 hover:bg-pink-100 rounded-full transition-colors"
                        >
                          <Github className="w-5 h-5 text-gray-600 hover:text-pink-600" />
                        </a>
                      )}
                      {project.live_url && (
                        <a
                          href={project.live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-100 hover:bg-pink-100 rounded-full transition-colors"
                        >
                          <ExternalLink className="w-5 h-5 text-gray-600 hover:text-pink-600" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Other Projects */}
        <section>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-4xl font-bold gradient-text mb-8" style={{ fontFamily: 'Playfair Display, serif' }}
          >
            🌟 Other Projects
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {otherProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card hover:scale-105 transition-transform"
              >
                <div className="relative h-48 bg-gradient-to-br from-pink-100 to-purple-100 overflow-hidden">
                  {project.image && resolveMediaUrl(project.image) ? (
                    <img
                      src={resolveMediaUrl(project.image)}
                      alt={project.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        {project.title}
                      </h3>
                      {project.status === 'on_hold' && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                          On Hold
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-pink-600 text-sm font-medium">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatProjectDate(project.date)}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4 text-sm font-medium">
                    {project.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {project.technologies.slice(0, 3).map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.technologies.length > 3 && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded text-xs font-medium">
                        +{project.technologies.length - 3} more
                      </span>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs px-3 py-1"
                    >
                      <Github className="w-3 h-3 mr-1" />
                      Code 💻
                    </a>
                    {project.live_url && (
                      <a
                        href={project.live_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-xs px-3 py-1"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Demo ✨
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
