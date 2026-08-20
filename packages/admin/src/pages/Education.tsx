import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import { Plus, Edit, Trash2, GraduationCap, Calendar, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

interface Education {
  id: number
  institution: string
  degree: string
  field_of_study?: string
  location?: string
  start_date: string
  end_date?: string | null
  gpa?: string
  grade?: string
  description?: string
  achievements?: string[]
}

interface EducationForm {
  institution: string
  degree: string
  field_of_study?: string
  location?: string
  start_date: string
  end_date?: string | null
  grade?: string
  description?: string
  achievements?: string[]
}

const Education = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEducation, setEditingEducation] = useState<Education | null>(null)
  const [achievements, setAchievements] = useState<string[]>([])
  const queryClient = useQueryClient()

  const { data: education, isLoading } = useQuery({
    queryKey: ['education'],
    queryFn: async () => {
      const response = await api.get('/education')
      return response.data.data as Education[]
    }
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EducationForm>({
    defaultValues: {
      achievements: []
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: EducationForm) => api.post('/education', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education'] })
      toast.success('Education entry created successfully')
      setIsModalOpen(false)
      reset()
      setAchievements([])
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create education entry')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: EducationForm }) => api.put(`/education/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education'] })
      toast.success('Education entry updated successfully')
      setIsModalOpen(false)
      setEditingEducation(null)
      reset()
      setAchievements([])
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update education entry')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/education/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education'] })
      toast.success('Education entry deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete education entry')
    }
  })

  const onSubmit = (data: EducationForm) => {
    const submitData = {
      ...data,
      achievements: achievements.filter(a => a.trim() !== '')
    }
    if (editingEducation) {
      updateMutation.mutate({ id: editingEducation.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const openModal = (edu?: Education) => {
    if (edu) {
      setEditingEducation(edu)
      // Format dates for HTML date input
      const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return ''
        try {
          return new Date(dateStr).toISOString().split('T')[0]
        } catch {
          return ''
        }
      }
      const eduAchievements = edu.achievements || []
      setAchievements(eduAchievements.length > 0 ? [...eduAchievements] : [''])
      reset({
        institution: edu.institution,
        degree: edu.degree,
        field_of_study: edu.field_of_study || '',
        location: edu.location || '',
        start_date: formatDate(edu.start_date),
        end_date: formatDate(edu.end_date),
        grade: edu.grade || edu.gpa || '',
        description: edu.description || '',
        achievements: eduAchievements
      })
    } else {
      setEditingEducation(null)
      setAchievements([''])
      reset({
        institution: '',
        degree: '',
        field_of_study: '',
        location: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        grade: '',
        description: '',
        achievements: []
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingEducation(null)
    reset()
    setAchievements([])
  }

  const addAchievement = () => {
    setAchievements([...achievements, ''])
  }

  const removeAchievement = (index: number) => {
    const newAchievements = achievements.filter((_, i) => i !== index)
    setAchievements(newAchievements.length > 0 ? newAchievements : [''])
  }

  const updateAchievement = (index: number, value: string) => {
    const newAchievements = [...achievements]
    newAchievements[index] = value
    setAchievements(newAchievements)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your education journey... 📚</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text" style={{ fontFamily: 'Playfair Display, serif' }}>🎓 Education</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Manage your educational background and achievements ✨
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-primary floating-hearts"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Education
        </button>
      </div>

      {/* Education Grid */}
      <div className="grid gap-6">
        {education?.map((edu) => (
          <div key={edu.id} className="card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-7 h-7 text-pink-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {edu.degree}
                    {edu.field_of_study && ` in ${edu.field_of_study}`}
                  </h3>
                  <p className="text-pink-600 font-semibold text-lg">{edu.institution}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal(edu)}
                  className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this education entry? 💔')) {
                      deleteMutation.mutate(edu.id)
                    }
                  }}
                  className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-pink-600 mb-4">
              {edu.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">{edu.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">
                  {new Date(edu.start_date).toLocaleDateString()} - {edu.end_date ? new Date(edu.end_date).toLocaleDateString() : 'Present'}
                </span>
              </div>
              {(edu.grade || edu.gpa) && (
                <div className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full text-sm font-semibold">
                  🏆 {edu.grade || edu.gpa}
                </div>
              )}
            </div>

            {edu.description && (
              <p className="text-gray-600 mb-4 font-medium">{edu.description}</p>
            )}

            {edu.achievements && edu.achievements.length > 0 && (
              <div>
                <h4 className="font-bold text-gray-800 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  ✨ Achievements:
                </h4>
                <ul className="space-y-2">
                  {edu.achievements.map((achievement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-pink-500 mt-1">•</span>
                      <span className="text-gray-600 font-medium">{achievement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {education?.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-r from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-10 h-10 text-pink-400" />
          </div>
          <p className="text-gray-500 text-xl font-semibold mb-2">No education entries found</p>
          <p className="text-gray-400 font-medium">Click "Add Education" to create your first entry 🎓</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="modal-overlay fixed inset-0" onClick={closeModal}></div>
            <div className="modal-content inline-block align-bottom text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="modal-header">
                  <h3 className="text-xl font-bold">
                    {editingEducation ? '✨ Edit Education' : '🎓 Add New Education'}
                  </h3>
                </div>
                <div className="modal-body">
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="form-group">
                        <label className="form-label">🏢 Institution *</label>
                        <input
                          {...register('institution', { required: 'Institution is required' })}
                          type="text"
                          className="form-input"
                          placeholder="University of Excellence"
                        />
                        {errors.institution && <p className="text-red-500 text-sm mt-1">{errors.institution.message}</p>}
                      </div>

                      <div className="form-group">
                        <label className="form-label">🎓 Degree *</label>
                        <input
                          {...register('degree', { required: 'Degree is required' })}
                          type="text"
                          className="form-input"
                          placeholder="Bachelor of Science"
                        />
                        {errors.degree && <p className="text-red-500 text-sm mt-1">{errors.degree.message}</p>}
                      </div>

                      <div className="form-group">
                        <label className="form-label">📚 Field of Study</label>
                        <input
                          {...register('field_of_study')}
                          type="text"
                          className="form-input"
                          placeholder="Computer Science"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">📍 Location</label>
                        <input
                          {...register('location')}
                          type="text"
                          className="form-input"
                          placeholder="New York, NY"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">📅 Start Date *</label>
                        <input
                          {...register('start_date', { required: 'Start date is required' })}
                          type="date"
                          className="form-input"
                        />
                        {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>}
                      </div>

                      <div className="form-group">
                        <label className="form-label">🏁 End Date</label>
                        <input
                          {...register('end_date')}
                          type="date"
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">🏆 Grade/GPA (max 10 characters)</label>
                        <input
                          {...register('grade', { 
                            maxLength: {
                              value: 10,
                              message: 'Grade/GPA must be 10 characters or less'
                            }
                          })}
                          type="text"
                          className="form-input"
                          placeholder="3.8 GPA"
                          maxLength={10}
                        />
                        {errors.grade && <p className="text-red-500 text-sm mt-1">{errors.grade.message}</p>}
                        <p className="text-xs text-gray-500 mt-1">Keep it short, e.g., "3.8 GPA" or "First Class"</p>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">📝 Description</label>
                      <textarea
                        {...register('description')}
                        rows={4}
                        className="form-textarea"
                        placeholder="Describe your educational experience, coursework, or highlights..."
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">🏆 Achievements</label>
                      {achievements.map((achievement, index) => (
                        <div key={index} className="flex gap-3 mb-3">
                          <input
                            type="text"
                            value={achievement}
                            onChange={(e) => updateAchievement(index, e.target.value)}
                            className="form-input flex-1"
                            placeholder="Dean's List, Summa Cum Laude, etc."
                          />
                          <button
                            type="button"
                            onClick={() => removeAchievement(index)}
                            className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addAchievement}
                        className="text-pink-600 hover:text-pink-800 text-sm font-medium"
                      >
                        ✨ Add Achievement
                      </button>
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
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="btn-success"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="spinner w-4 h-4 mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      editingEducation ? '✨ Update Education' : '🎓 Create Education'
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

export default Education
