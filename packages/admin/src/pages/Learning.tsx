import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import { Plus, Edit, Trash2, BookOpen, Award } from 'lucide-react'
import toast from 'react-hot-toast'

interface LearningItem {
  id: number
  title: string
  description: string
  progress: number
  category: string
  start_date: string
  estimated_completion?: string
  resources: string[]
  status: 'in_progress' | 'completed' | 'paused'
}

interface Skill {
  id: number
  name: string
  description?: string
  category: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
}

interface LearningForm {
  title: string
  description: string
  progress: number
  category: string
  start_date: string
  estimated_completion?: string
  resources: string
  status: 'in_progress' | 'completed' | 'paused'
}

interface SkillForm {
  name: string
  description?: string
  category: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
}

const Learning = () => {
  const [activeTab, setActiveTab] = useState<'learning' | 'skills'>('learning')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LearningItem | Skill | null>(null)
  const queryClient = useQueryClient()

  const { data: learning, isLoading: learningLoading } = useQuery({
    queryKey: ['learning'],
    queryFn: async () => {
      const response = await api.get('/learning')
      return response.data.data as LearningItem[]
    }
  })

  const { data: skills, isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const response = await api.get('/skills')
      return response.data.data as Skill[]
    }
  })

  const { register: registerLearning, handleSubmit: handleLearningSubmit, reset: resetLearning, formState: { errors: learningErrors } } = useForm<LearningForm>()
  const { register: registerSkill, handleSubmit: handleSkillSubmit, reset: resetSkill, formState: { errors: skillErrors } } = useForm<SkillForm>()

  const createLearningMutation = useMutation({
    mutationFn: (data: LearningForm) => api.post('/learning', {
      ...data,
      resources: data.resources.split(',').map(r => r.trim()).filter(r => r)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning'] })
      toast.success('Learning item created successfully')
      setIsModalOpen(false)
      resetLearning()
    }
  })

  const createSkillMutation = useMutation({
    mutationFn: (data: SkillForm) => api.post('/skills', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
      toast.success('Skill added successfully')
      setIsModalOpen(false)
      resetSkill()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create skill')
    }
  })

  const updateLearningMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: LearningForm }) => api.put(`/learning/${id}`, {
      ...data,
      resources: data.resources.split(',').map(r => r.trim()).filter(r => r)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning'] })
      toast.success('Learning item updated successfully')
      setIsModalOpen(false)
      setEditingItem(null)
      resetLearning()
    }
  })

  const deleteLearningMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/learning/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning'] })
      toast.success('Learning item deleted successfully')
    }
  })

  const updateSkillMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: SkillForm }) => api.put(`/skills/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
      toast.success('Skill updated successfully')
      setIsModalOpen(false)
      setEditingItem(null)
      resetSkill()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update skill')
    }
  })

  const deleteSkillMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/skills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
      toast.success('Skill deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete skill')
    }
  })

  const openModal = (item?: LearningItem | Skill, type: 'learning' | 'skill' = activeTab === 'learning' ? 'learning' : 'skill') => {
    if (item && type === 'learning') {
      const learningItem = item as LearningItem
      setEditingItem(learningItem)
      resetLearning({
        title: learningItem.title,
        description: learningItem.description,
        progress: learningItem.progress,
        category: learningItem.category,
        start_date: learningItem.start_date,
        estimated_completion: learningItem.estimated_completion,
        resources: learningItem.resources.join(', '),
        status: learningItem.status
      })
    } else if (item && type === 'skill') {
      const skill = item as Skill
      setEditingItem(skill)
      resetSkill({
        name: skill.name,
        description: skill.description || '',
        category: skill.category,
        level: skill.level
      })
    } else {
      setEditingItem(null)
      if (type === 'learning') {
        resetLearning({
          title: '',
          description: '',
          progress: 0,
          category: '',
          start_date: new Date().toISOString().split('T')[0],
          estimated_completion: '',
          resources: '',
          status: 'in_progress'
        })
      } else {
        resetSkill({
          name: '',
          description: '',
          category: '',
          level: 'beginner'
        })
      }
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    resetLearning()
    resetSkill()
  }

  const onLearningSubmit = (data: LearningForm) => {
    if (editingItem && 'progress' in editingItem) {
      updateLearningMutation.mutate({ id: editingItem.id, data })
    } else {
      createLearningMutation.mutate(data)
    }
  }

  const onSkillSubmit = (data: SkillForm) => {
    // Clean up the data - remove empty description
    const cleanData = {
      ...data,
      description: data.description && data.description.trim() !== '' ? data.description.trim() : undefined
    }
    
    if (editingItem && 'name' in editingItem && !('progress' in editingItem)) {
      updateSkillMutation.mutate({ id: editingItem.id, data: cleanData })
    } else {
      createSkillMutation.mutate(cleanData)
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text" style={{ fontFamily: 'Playfair Display, serif' }}>📚 Learning & Skills</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Manage your beautiful learning journey and amazing skills ✨
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-primary floating-hearts"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {activeTab === 'learning' ? 'Learning Item' : 'Skill'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-pink-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('learning')}
            className={`py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-all duration-300 ${
              activeTab === 'learning'
                ? 'border-pink-500 text-pink-600 bg-pink-50'
                : 'border-transparent text-gray-500 hover:text-pink-600 hover:border-pink-300 hover:bg-pink-25'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            📖 Current Learning
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-all duration-300 ${
              activeTab === 'skills'
                ? 'border-pink-500 text-pink-600 bg-pink-50'
                : 'border-transparent text-gray-500 hover:text-pink-600 hover:border-pink-300 hover:bg-pink-25'
            }`}
          >
            <Award className="w-4 h-4 inline mr-2" />
            ✅ Completed Skills
          </button>
        </nav>
      </div>

      {/* Learning Items */}
      {activeTab === 'learning' && (
        <div className="space-y-4">
          {learningLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="spinner mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading your learning journey... 📚</p>
              </div>
            </div>
          ) : (
            learning?.map((item) => (
              <div key={item.id} className="card p-6 hover:scale-105 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 font-medium">{item.description}</p>
                    <div className="flex items-center mt-3 space-x-3">
                      <span className="px-3 py-1 text-xs bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 rounded-full font-medium">
                        {item.category}
                      </span>
                      <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        item.status === 'completed' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' :
                        item.status === 'paused' ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700' :
                        'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700'
                      }`}>
                        {item.status === 'completed' ? '✅ Completed' :
                         item.status === 'paused' ? '⏸️ Paused' :
                         '📚 In Progress'}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openModal(item, 'learning')}
                      className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this learning item? 💔')) {
                          deleteLearningMutation.mutate(item.id)
                        }
                      }}
                      className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">Progress ✨</span>
                    <span className="text-sm font-bold text-pink-600">{item.progress}%</span>
                  </div>
                  <div className="w-full bg-pink-100 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-pink-400 to-purple-500"
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                </div>
                {item.resources.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Resources 📖</p>
                    <div className="flex flex-wrap gap-2">
                      {item.resources.map((resource, index) => (
                        <span key={index} className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                          {resource}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Skills */}
      {activeTab === 'skills' && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {skillsLoading ? (
            <div className="col-span-full flex justify-center items-center h-64">
              <div className="text-center">
                <div className="spinner mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading your amazing skills... ✨</p>
              </div>
            </div>
          ) : (
            skills?.map((skill) => (
              <div key={skill.id} className="card p-6 hover:scale-105 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>{skill.name}</h3>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    skill.level === 'advanced' ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' :
                    skill.level === 'intermediate' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
                    'bg-gradient-to-r from-blue-400 to-indigo-500 text-white'
                  }`}>
                    {skill.level === 'advanced' ? '🏆 Advanced' :
                     skill.level === 'intermediate' ? '⭐ Intermediate' :
                     '🌱 Beginner'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4 font-medium">{skill.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1 text-xs bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 rounded-full font-medium">
                      {skill.category}
                    </span>
                    <span className="text-xs text-pink-600 font-medium">
                      Level: {skill.level}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this skill? 💔')) {
                        deleteSkillMutation.mutate(skill.id)
                      }
                    }}
                    className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="modal-overlay fixed inset-0" onClick={closeModal}></div>
            <div className="modal-content inline-block align-bottom text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {activeTab === 'learning' ? (
                <form onSubmit={handleLearningSubmit(onLearningSubmit)}>
                  <div className="modal-header">
                    <h3 className="text-xl font-bold">
                      {editingItem ? '✨ Edit Learning Item' : '📚 Add Learning Item'}
                    </h3>
                  </div>
                  <div className="modal-body">
                    <div className="space-y-5">
                      <div className="form-group">
                        <label className="form-label">📚 Learning Title</label>
                        <input
                          {...registerLearning('title', { required: 'Title is required' })}
                          type="text"
                          className="form-input"
                          placeholder="What are you learning?"
                        />
                        {learningErrors.title && <p className="text-red-500 text-sm mt-1">{learningErrors.title.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                          {...registerLearning('description', { required: 'Description is required' })}
                          rows={3}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                        {learningErrors.description && <p className="text-red-600 text-sm">{learningErrors.description.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <input
                          {...registerLearning('category', { required: 'Category is required' })}
                          type="text"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                        {learningErrors.category && <p className="text-red-600 text-sm">{learningErrors.category.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Progress (%)</label>
                        <input
                          {...registerLearning('progress', { required: 'Progress is required', min: 0, max: 100 })}
                          type="number"
                          min="0"
                          max="100"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                        {learningErrors.progress && <p className="text-red-600 text-sm">{learningErrors.progress.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                        <input
                          {...registerLearning('start_date', { required: 'Start date is required' })}
                          type="date"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                        {learningErrors.start_date && <p className="text-red-600 text-sm">{learningErrors.start_date.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Estimated Completion</label>
                        <input
                          {...registerLearning('estimated_completion')}
                          type="date"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Resources (comma-separated)</label>
                        <input
                          {...registerLearning('resources')}
                          type="text"
                          placeholder="Book, Course, Tutorial"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                          {...registerLearning('status')}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="paused">Paused</option>
                        </select>
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
                      disabled={createLearningMutation.isPending || updateLearningMutation.isPending}
                      className="btn-success"
                    >
                      {createLearningMutation.isPending || updateLearningMutation.isPending ? (
                        <div className="flex items-center">
                          <div className="spinner w-4 h-4 mr-2"></div>
                          Saving...
                        </div>
                      ) : (
                        editingItem ? '✨ Update Learning' : '📚 Add Learning'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSkillSubmit(onSkillSubmit)}>
                  <div className="modal-header">
                    <h3 className="text-xl font-bold">
                      {editingItem && 'name' in editingItem ? '✨ Edit Skill' : '🏆 Add New Skill'}
                    </h3>
                  </div>
                  <div className="modal-body">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name *</label>
                        <input
                          {...registerSkill('name', { required: 'Name is required' })}
                          type="text"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                          placeholder="e.g., React, TypeScript, Node.js"
                        />
                        {skillErrors.name && <p className="text-red-600 text-sm">{skillErrors.name.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                          {...registerSkill('description')}
                          rows={3}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Optional description of the skill"
                        />
                        {skillErrors.description && <p className="text-red-600 text-sm">{skillErrors.description.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Category *</label>
                        <input
                          {...registerSkill('category', { required: 'Category is required' })}
                          type="text"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                          placeholder="e.g., Frontend, Backend, Database"
                        />
                        {skillErrors.category && <p className="text-red-600 text-sm">{skillErrors.category.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Level *</label>
                        <select
                          {...registerSkill('level', { required: 'Level is required' })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="expert">Expert</option>
                        </select>
                        {skillErrors.level && <p className="text-red-600 text-sm">{skillErrors.level.message}</p>}
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
                      disabled={createSkillMutation.isPending || updateSkillMutation.isPending}
                      className="btn-success"
                    >
                      {createSkillMutation.isPending || updateSkillMutation.isPending ? (
                        <div className="flex items-center">
                          <div className="spinner w-4 h-4 mr-2"></div>
                          Saving...
                        </div>
                      ) : (
                        editingItem && 'name' in editingItem ? '✨ Update Skill' : '🏆 Add Skill'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Learning
