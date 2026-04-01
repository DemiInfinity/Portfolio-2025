import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import { Plus, Edit, Trash2, ExternalLink, Github } from 'lucide-react'
import toast from 'react-hot-toast'
import { ImageUploadButton } from '@/components/ImageUploadButton'

interface Project {
  id: number
  title: string
  description: string
  image?: string
  technologies: string[] | string
  github_url?: string
  live_url?: string
  date: string
  featured: boolean
}

interface ProjectForm {
  title: string
  description: string
  image?: string
  technologies: string
  github_url?: string
  live_url?: string
  date: string
  featured: boolean
}

const Projects = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const queryClient = useQueryClient()

  const { data: projects, isLoading } = useQuery('projects', async () => {
    const response = await api.get('/projects')
    const projectsData = response.data.data as any[]
    // Ensure technologies is always an array
    return projectsData.map((project: any) => {
      let technologies: string[] = []
      const techValue = project.technologies
      
      if (Array.isArray(techValue)) {
        technologies = techValue
      } else if (typeof techValue === 'string') {
        try {
          if (techValue.startsWith('[')) {
            technologies = JSON.parse(techValue)
          } else {
            technologies = techValue.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
          }
        } catch {
          technologies = []
        }
      }
      
      return {
        ...project,
        technologies
      } as Project
    })
  })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProjectForm>()

  const createMutation = useMutation(
    (data: ProjectForm) => api.post('/projects', {
      ...data,
      technologies: data.technologies.split(',').map(t => t.trim())
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects')
        toast.success('Project created successfully')
        setIsModalOpen(false)
        reset()
      },
      onError: (error: any) => {
        console.error('Create error:', error)
        toast.error(error.response?.data?.error || 'Failed to create project')
      }
    }
  )

  const updateMutation = useMutation(
    ({ id, data }: { id: number, data: ProjectForm }) => api.put(`/projects/${id}`, {
      ...data,
      technologies: data.technologies.split(',').map(t => t.trim())
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects')
        toast.success('Project updated successfully')
        setIsModalOpen(false)
        setEditingProject(null)
        reset()
      },
      onError: (error: any) => {
        console.error('Update error:', error)
        toast.error(error.response?.data?.error || 'Failed to update project')
      }
    }
  )

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/projects/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects')
        toast.success('Project deleted successfully')
      }
    }
  )

  const onSubmit = (data: ProjectForm) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const openModal = (project?: Project) => {
    if (project) {
      setEditingProject(project)
      // Format date for HTML date input (YYYY-MM-DD)
      const formattedDate = project.date 
        ? new Date(project.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
      
      // Ensure technologies is an array before joining
      const technologiesString = Array.isArray(project.technologies) 
        ? project.technologies.join(', ')
        : (typeof project.technologies === 'string' ? project.technologies : '')
      
      reset({
        title: project.title,
        description: project.description,
        image: project.image,
        technologies: technologiesString,
        github_url: project.github_url,
        live_url: project.live_url,
        date: formattedDate,
        featured: project.featured
      })
    } else {
      setEditingProject(null)
      reset({
        title: '',
        description: '',
        image: '',
        technologies: '',
        github_url: '',
        live_url: '',
        date: new Date().toISOString().split('T')[0],
        featured: false
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProject(null)
    reset()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your beautiful projects... ✨</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text" style={{ fontFamily: 'Playfair Display, serif' }}>✨ Projects</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Manage your beautiful portfolio projects 💖
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-primary floating-hearts"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <div key={project.id} className="card p-6 hover:scale-105 transition-all duration-300">
            <div className="h-48 bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
              {project.image ? (
                <img src={project.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl opacity-50">🎨</span>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>{project.title}</h3>
                {project.featured && (
                  <span className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full">
                    ⭐ Featured
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 line-clamp-3 font-medium">{project.description}</p>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(project.technologies) && project.technologies.length > 0 ? (
                  <>
                    {project.technologies.slice(0, 3).map((tech) => (
                      <span key={tech} className="px-3 py-1 text-xs bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 rounded-full font-medium">
                        {tech}
                      </span>
                    ))}
                    {project.technologies.length > 3 && (
                      <span className="px-3 py-1 text-xs bg-gray-100 text-gray-500 rounded-full font-medium">
                        +{project.technologies.length - 3} more
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400 text-xs">No technologies listed</span>
                )}
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex space-x-3">
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-pink-100 hover:text-pink-600 transition-colors"
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                  {project.live_url && (
                    <a
                      href={project.live_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-pink-100 hover:text-pink-600 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openModal(project)}
                    className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this project? 💔')) {
                        deleteMutation.mutate(project.id)
                      }
                    }}
                    className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="modal-overlay fixed inset-0" onClick={closeModal}></div>
            <div className="modal-content inline-block align-bottom text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="modal-header">
                  <h3 className="text-xl font-bold">
                    {editingProject ? '✨ Edit Project' : '💖 Add New Project'}
                  </h3>
                </div>
                <div className="modal-body">
                  <div className="space-y-5">
                    <div className="form-group">
                      <label className="form-label">💖 Project Title</label>
                      <input
                        {...register('title', { required: 'Title is required' })}
                        type="text"
                        className="form-input"
                        placeholder="My Amazing Project"
                      />
                      {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">📝 Description</label>
                      <textarea
                        {...register('description', { required: 'Description is required' })}
                        rows={4}
                        className="form-textarea"
                        placeholder="Tell us about this beautiful project..."
                      />
                      {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">🖼️ Project image URL</label>
                      <p className="text-sm text-gray-500 mb-2">Card thumbnail on the portfolio site.</p>
                      <input
                        {...register('image')}
                        type="url"
                        className="form-input"
                        placeholder="https://… or upload below"
                      />
                      <div className="mt-2">
                        <ImageUploadButton
                          label="Upload image"
                          onUploaded={(url) => setValue('image', url)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">🛠️ Technologies (comma-separated)</label>
                      <input
                        {...register('technologies', { required: 'Technologies are required' })}
                        type="text"
                        placeholder="React, TypeScript, Node.js, PostgreSQL"
                        className="form-input"
                      />
                      {errors.technologies && <p className="text-red-500 text-sm mt-1">{errors.technologies.message}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label">🔗 GitHub URL</label>
                        <input
                          {...register('github_url')}
                          type="url"
                          className="form-input"
                          placeholder="https://github.com/..."
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">🌐 Live URL</label>
                        <input
                          {...register('live_url')}
                          type="url"
                          className="form-input"
                          placeholder="https://myproject.com"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">📅 Project Date</label>
                      <input
                        {...register('date', { required: 'Date is required' })}
                        type="date"
                        className="form-input"
                      />
                      {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        {...register('featured')}
                        type="checkbox"
                        className="h-5 w-5 text-pink-600 focus:ring-pink-500 border-pink-300 rounded"
                        id="featured"
                      />
                      <label htmlFor="featured" className="text-sm font-medium text-gray-700">⭐ Featured project (show on homepage)</label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isLoading || updateMutation.isLoading}
                    className="btn-success"
                  >
                    {createMutation.isLoading || updateMutation.isLoading ? (
                      <div className="flex items-center">
                        <div className="spinner w-4 h-4 mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      editingProject ? '✨ Update Project' : '💖 Create Project'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Projects
