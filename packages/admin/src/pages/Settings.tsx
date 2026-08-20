import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { User, Lock, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProfileForm {
  name: string
  email: string
}

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const Settings = () => {
  const { user, refreshUser, loading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  const { register: registerProfile, handleSubmit: handleProfileSubmit, reset: resetProfile, formState: { errors: profileErrors } } = useForm<ProfileForm>({
    defaultValues: {
      name: '',
      email: ''
    }
  })

  // Reset form when user changes (e.g., after logout/login)
  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name || '',
        email: user.email || ''
      })
    } else {
      resetProfile({
        name: '',
        email: ''
      })
    }
  }, [user, resetProfile])

  // Don't render if not authenticated
  if (loading || !user) {
    return null
  }

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPassword, watch, formState: { errors: passwordErrors } } = useForm<PasswordForm>()

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileForm) => api.put('/auth/profile', data),
    onSuccess: async () => {
      toast.success('Profile updated successfully')
      // Refresh user data
      await refreshUser()
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to update profile'
      toast.error(message)
    }
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string, newPassword: string }) => api.put('/auth/change-password', data),
    onSuccess: () => {
      toast.success('Password changed successfully')
      resetPassword()
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to change password'
      toast.error(message)
    }
  })

  const onProfileSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate(data)
  }

  const onPasswordSubmit = (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    })
  }

  const watchNewPassword = watch('newPassword')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text" style={{ fontFamily: 'Playfair Display, serif' }}>⚙️ Settings</h1>
        <p className="mt-2 text-gray-600 font-medium">
          Manage your account settings and preferences ✨
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b-2 border-gradient-to-r from-pink-200 to-purple-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 border-b-2 font-bold text-sm rounded-t-lg transition-all duration-300 ${
              activeTab === 'profile'
                ? 'border-pink-500 text-pink-600 bg-gradient-to-r from-pink-50 to-purple-50'
                : 'border-transparent text-gray-500 hover:text-pink-600 hover:border-pink-300 hover:bg-pink-50'
            }`}
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            <User className="w-5 h-5 inline mr-2" />
            👤 Profile
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-3 px-4 border-b-2 font-bold text-sm rounded-t-lg transition-all duration-300 ${
              activeTab === 'password'
                ? 'border-pink-500 text-pink-600 bg-gradient-to-r from-pink-50 to-purple-50'
                : 'border-transparent text-gray-500 hover:text-pink-600 hover:border-pink-300 hover:bg-pink-50'
            }`}
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            <Lock className="w-5 h-5 inline mr-2" />
            🔒 Password
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card p-6">
          <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
            <div>
              <h3 className="text-xl font-bold gradient-text mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                👤 Profile Information
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    ✨ Full Name
                  </label>
                  <input
                    {...registerProfile('name', { required: 'Name is required' })}
                    type="text"
                    className="form-input"
                  />
                  {profileErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    📧 Email Address
                  </label>
                  <input
                    {...registerProfile('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    type="email"
                    className="form-input"
                  />
                  {profileErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.email.message}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-6 py-4 rounded-b-xl text-right">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="btn-success floating-hearts"
              >
                <Save className="w-5 h-5 mr-2" />
                {updateProfileMutation.isPending ? '💾 Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="card p-6">
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
            <div>
              <h3 className="text-xl font-bold gradient-text mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                🔒 Change Password
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    🔐 Current Password
                  </label>
                  <input
                    {...registerPassword('currentPassword', { 
                      required: 'Current password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters'
                      }
                    })}
                    type="password"
                    className="form-input"
                  />
                  {passwordErrors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    🆕 New Password
                  </label>
                  <input
                    {...registerPassword('newPassword', { 
                      required: 'New password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters'
                      }
                    })}
                    type="password"
                    className="form-input"
                  />
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    ✅ Confirm New Password
                  </label>
                  <input
                    {...registerPassword('confirmPassword', { 
                      required: 'Please confirm your new password',
                      validate: value => value === watchNewPassword || 'Passwords do not match'
                    })}
                    type="password"
                    className="form-input"
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-6 py-4 rounded-b-xl text-right">
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="btn-success floating-hearts"
              >
                <Lock className="w-5 h-5 mr-2" />
                {changePasswordMutation.isPending ? '🔄 Changing...' : '🔒 Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* System Information */}
      <div className="card p-6">
        <h3 className="text-xl font-bold gradient-text mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
          💻 System Information
        </h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
              <dt className="text-sm font-bold text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>👑 User Role</dt>
              <dd className="mt-2 text-sm font-medium text-gray-800">{user?.role}</dd>
            </div>
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
              <dt className="text-sm font-bold text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>✅ Account Status</dt>
              <dd className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-200 text-green-800">
                  🟢 Active
                </span>
              </dd>
            </div>
            <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
              <dt className="text-sm font-bold text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>🌐 Frontend URL</dt>
              <dd className="mt-2">
                <a href="https://demitaylornimmo.com" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-500 font-medium hover:underline">
                  https://demitaylornimmo.com
                </a>
              </dd>
            </div>
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
              <dt className="text-sm font-bold text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>🔌 API URL</dt>
              <dd className="mt-2">
                <a href={`${(import.meta as any).env.VITE_API_URL || 'https://api.demitaylornimmo.com'}/api`} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-500 font-medium hover:underline">
                  {`${(import.meta as any).env.VITE_API_URL || 'https://api.demitaylornimmo.com'}/api`}
                </a>
              </dd>
            </div>
          </dl>
      </div>
    </div>
  )
}

export default Settings
