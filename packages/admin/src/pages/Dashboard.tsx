import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Users, FileText, Briefcase, BookOpen, GraduationCap, Award } from 'lucide-react'

const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [projects, learning, blog, workHistory, education, certifications] = await Promise.all([
        api.get('/projects'),
        api.get('/learning'),
        api.get('/blog/admin/all'),
        api.get('/work-history'),
        api.get('/education'),
        api.get('/certifications')
      ])

      return {
        projects: projects.data.data.length,
        learning: learning.data.data.length,
        blogPosts: blog.data.data.length,
        workHistory: workHistory.data.data.length,
        education: education.data.data.length,
        certifications: certifications.data.data.length,
        publishedPosts: blog.data.data.filter((post: any) => post.published).length
      }
    }
  })

  const statCards = [
    {
      name: '💼 Total Projects',
      value: stats?.projects || 0,
      icon: Briefcase,
      color: 'bg-gradient-to-r from-blue-400 to-blue-600',
    },
    {
      name: '📚 Learning Items',
      value: stats?.learning || 0,
      icon: BookOpen,
      color: 'bg-gradient-to-r from-green-400 to-emerald-600',
    },
    {
      name: '📝 Blog Posts',
      value: stats?.blogPosts || 0,
      icon: FileText,
      color: 'bg-gradient-to-r from-purple-400 to-purple-600',
    },
    {
      name: '👥 Work Experience',
      value: stats?.workHistory || 0,
      icon: Users,
      color: 'bg-gradient-to-r from-orange-400 to-orange-600',
    },
    {
      name: '🎓 Education',
      value: stats?.education || 0,
      icon: GraduationCap,
      color: 'bg-gradient-to-r from-pink-400 to-pink-600',
    },
    {
      name: '🏆 Certifications',
      value: stats?.certifications || 0,
      icon: Award,
      color: 'bg-gradient-to-r from-indigo-400 to-indigo-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text" style={{ fontFamily: 'Playfair Display, serif' }}>✨ Dashboard</h1>
        <p className="mt-2 text-gray-600 font-medium">
          Overview of your beautiful portfolio content and statistics 💖
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.name} className="card p-5 hover:scale-105 transition-all duration-300">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-600 truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {item.name}
                    </dt>
                    <dd className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {item.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="text-xl font-bold gradient-text mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
          🚀 Quick Actions
        </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/projects"
              className="relative group card p-6 hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-pink-200"
            >
              <div>
                <span className="rounded-xl inline-flex p-3 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700">
                  <Briefcase className="w-6 h-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <span className="absolute inset-0" aria-hidden="true" />
                  💼 Manage Projects
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Add, edit, or remove projects from your portfolio ✨
                </p>
              </div>
            </a>

            <a
              href="/blog"
              className="relative group card p-6 hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-pink-200"
            >
              <div>
                <span className="rounded-xl inline-flex p-3 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700">
                  <FileText className="w-6 h-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <span className="absolute inset-0" aria-hidden="true" />
                  📝 Write Blog Post
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Create and publish new blog articles 💖
                </p>
              </div>
            </a>

            <a
              href="/learning"
              className="relative group card p-6 hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-pink-200"
            >
              <div>
                <span className="rounded-xl inline-flex p-3 bg-gradient-to-r from-green-100 to-green-200 text-green-700">
                  <BookOpen className="w-6 h-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <span className="absolute inset-0" aria-hidden="true" />
                  📚 Update Learning
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Track your learning progress and add new skills 🌟
                </p>
              </div>
            </a>

            <a
              href="/education"
              className="relative group card p-6 hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-pink-200"
            >
              <div>
                <span className="rounded-xl inline-flex p-3 bg-gradient-to-r from-pink-100 to-pink-200 text-pink-700">
                  <GraduationCap className="w-6 h-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <span className="absolute inset-0" aria-hidden="true" />
                  🎓 Manage Education
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Add and update your educational background 📖
                </p>
              </div>
            </a>
          </div>
      </div>

      {/* Portfolio Stats */}
      <div className="card p-6">
        <h3 className="text-xl font-bold gradient-text mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
          📊 Portfolio Overview
        </h3>
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
            <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
              🚀 Published Blog Posts
            </span>
            <span className="text-lg font-bold text-pink-600" style={{ fontFamily: 'Playfair Display, serif' }}>
              {stats?.publishedPosts || 0} / {stats?.blogPosts || 0}
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
            <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
              ✨ Total Content Items
            </span>
            <span className="text-lg font-bold text-blue-600" style={{ fontFamily: 'Playfair Display, serif' }}>
              {(stats?.projects || 0) + (stats?.learning || 0) + (stats?.blogPosts || 0) + (stats?.workHistory || 0) + (stats?.education || 0) + (stats?.certifications || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
