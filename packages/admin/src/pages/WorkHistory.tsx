import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import { Plus, Edit, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface WorkHistoryItem {
  id: number
  company: string
  position: string
  location: string
  start_date: string
  end_date?: string
  description: string
  achievements: string[]
  technologies: string[]
  company_url?: string
}

interface WorkHistoryForm {
  company: string
  position: string
  location: string
  start_date: string
  end_date?: string
  description: string
  achievements: string
  technologies: string
  company_url?: string
}

const WorkHistory = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WorkHistoryItem | null>(null)
  const queryClient = useQueryClient()

  const { data: workHistory, isLoading: workLoading } = useQuery({
    queryKey: ['work-history'],
    queryFn: async () => {
      const response = await api.get('/work-history')
      return response.data.data as WorkHistoryItem[]
    }
  })


  const { register, handleSubmit, reset, formState: { errors } } = useForm<WorkHistoryForm>()

  const createMutation = useMutation({
    mutationFn: (data: WorkHistoryForm) => api.post('/work-history', {
      ...data,
      achievements: data.achievements.split('\n').filter(a => a.trim()),
      technologies: data.technologies.split(',').map(t => t.trim()).filter(t => t)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-history'] })
      toast.success('Work history created successfully')
      setIsModalOpen(false)
      reset()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: WorkHistoryForm }) => api.put(`/work-history/${id}`, {
      ...data,
      achievements: data.achievements.split('\n').filter(a => a.trim()),
      technologies: data.technologies.split(',').map(t => t.trim()).filter(t => t)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-history'] })
      toast.success('Work history updated successfully')
      setIsModalOpen(false)
      setEditingItem(null)
      reset()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/work-history/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-history'] })
      toast.success('Work history deleted successfully')
    }
  })

  const onSubmit = (data: WorkHistoryForm) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const openModal = (item?: WorkHistoryItem) => {
    if (item) {
      setEditingItem(item)
      reset({
        company: item.company,
        position: item.position,
        location: item.location,
        start_date: item.start_date,
        end_date: item.end_date,
        description: item.description,
        achievements: item.achievements.join('\n'),
        technologies: item.technologies.join(', '),
        company_url: item.company_url
      })
    } else {
      setEditingItem(null)
      reset({
        company: '',
        position: '',
        location: '',
        start_date: '',
        end_date: '',
        description: '',
        achievements: '',
        technologies: '',
        company_url: ''
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    reset()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text" style={{ fontFamily: 'Playfair Display, serif' }}>💼 Work History</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Manage your amazing professional journey ✨
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-primary floating-hearts"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Experience
        </button>
      </div>


      {/* Work Experience */}
      <div className="space-y-6">
          {workLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="spinner mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading your career journey... 💼</p>
              </div>
            </div>
          ) : (
            workHistory?.map((item) => (
              <div key={item.id} className="card p-6 hover:scale-105 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.position}</h3>
                    <p className="text-pink-600 font-semibold text-lg">{item.company}</p>
                    <p className="text-gray-600 font-medium">📍 {item.location}</p>
                    <p className="text-pink-500 font-medium text-sm">
                      📅 {new Date(item.start_date).toLocaleDateString()} - {item.end_date ? new Date(item.end_date).toLocaleDateString() : '✨ Present'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openModal(item)}
                      className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this work experience? 💔')) {
                          deleteMutation.mutate(item.id)
                        }
                      }}
                      className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 mb-4 font-medium leading-relaxed">{item.description}</p>
                {item.achievements.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center">🏆 Key Achievements:</h4>
                    <ul className="space-y-2">
                      {item.achievements.map((achievement, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <span className="text-pink-500 mr-2 mt-1">✨</span>
                          <span className="font-medium">{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.technologies.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center">🛠️ Technologies:</h4>
                    <div className="flex flex-wrap gap-2">
                      {item.technologies.map((tech) => (
                        <span key={tech} className="px-3 py-1 text-xs bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 rounded-full font-medium">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="modal-overlay fixed inset-0" onClick={closeModal}></div>
            <div className="modal-content inline-block align-bottom text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="modal-header">
                  <h3 className="text-xl font-bold">
                    {editingItem ? '✨ Edit Work Experience' : '💼 Add Work Experience'}
                  </h3>
                </div>
                <div className="modal-body">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="form-group">
                      <label className="form-label">🏢 Company</label>
                      <input
                        {...register('company', { required: 'Company is required' })}
                        type="text"
                        className="form-input"
                        placeholder="Amazing Company Inc."
                      />
                      {errors.company && <p className="text-red-500 text-sm mt-1">{errors.company.message}</p>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">💼 Position</label>
                      <input
                        {...register('position', { required: 'Position is required' })}
                        type="text"
                        className="form-input"
                        placeholder="Senior Software Engineer"
                      />
                      {errors.position && <p className="text-red-500 text-sm mt-1">{errors.position.message}</p>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">📍 Location</label>
                      <input
                        {...register('location', { required: 'Location is required' })}
                        type="text"
                        className="form-input"
                        placeholder="San Francisco, CA"
                      />
                      {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">🌐 Company URL</label>
                      <input
                        {...register('company_url')}
                        type="url"
                        className="form-input"
                        placeholder="https://company.com"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">📅 Start Date</label>
                      <input
                        {...register('start_date', { required: 'Start date is required' })}
                        type="date"
                        className="form-input"
                      />
                      {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">🏁 End Date (leave empty if current)</label>
                      <input
                        {...register('end_date')}
                        type="date"
                        className="form-input"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">📝 Job Description</label>
                    <textarea
                      {...register('description', { required: 'Description is required' })}
                      rows={4}
                      className="form-textarea"
                      placeholder="Describe your role and responsibilities..."
                    />
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">🏆 Key Achievements (one per line)</label>
                    <textarea
                      {...register('achievements')}
                      rows={5}
                      placeholder="Increased sales by 20%&#10;Led team of 5 developers&#10;Implemented new CI/CD pipeline&#10;Reduced deployment time by 50%"
                      className="form-textarea"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">🛠️ Technologies (comma-separated)</label>
                    <input
                      {...register('technologies')}
                      type="text"
                      placeholder="React, Node.js, PostgreSQL, Docker, AWS"
                      className="form-input"
                    />
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
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="btn-success"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="spinner w-4 h-4 mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      editingItem ? '✨ Update Experience' : '💼 Add Experience'
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

export default WorkHistory
