import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { BarChart3, Users, Eye, Clock, Globe } from 'lucide-react'

interface AnalyticsOverview {
  totalVisits: number
  uniqueVisitors: number
  pageViews: Array<{
    page_path: string
    views: number
    avg_duration: number
  }>
  dailyVisits: Array<{
    date: string
    visits: number
  }>
  topReferrers: Array<{
    referrer: string
    visits: number
  }>
}

const Analytics = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const response = await api.get('/analytics/overview')
      return response.data.data as AnalyticsOverview
    }
  })

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getPageDisplayName = (path: string) => {
    const pathMap: { [key: string]: string } = {
      '/': 'Home',
      '/projects': 'Projects',
      '/work-history': 'Work History',
      '/learning': 'Learning',
      '/blog': 'Blog',
      '/about': 'About'
    }
    return pathMap[path] || path
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your analytics data... 📈</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text" style={{ fontFamily: 'Playfair Display, serif' }}>📊 Analytics Dashboard</h1>
        <p className="mt-2 text-gray-600 font-medium">
          Track visitor engagement and page performance ✨
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5 hover:scale-105 transition-all duration-300">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Eye className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-4 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-600 truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  👁️ Total Visits
                </dt>
                <dd className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {analytics?.totalVisits || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-5 hover:scale-105 transition-all duration-300">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-4 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-600 truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  👥 Unique Visitors
                </dt>
                <dd className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {analytics?.uniqueVisitors || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-5 hover:scale-105 transition-all duration-300">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-4 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-600 truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  📊 Pages Tracked
                </dt>
                <dd className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {analytics?.pageViews?.length || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-5 hover:scale-105 transition-all duration-300">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-4 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-600 truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  ⏱️ Avg. Duration
                </dt>
                <dd className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {analytics?.pageViews?.length ? 
                    formatDuration(Math.round(analytics.pageViews.reduce((acc, pv) => acc + pv.avg_duration, 0) / analytics.pageViews.length)) : 
                    '0s'
                  }
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Page Views */}
      <div className="card p-6">
        <h3 className="text-xl font-bold gradient-text mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
          📄 Page Views
        </h3>
          <div className="space-y-4">
            {analytics?.pageViews?.map((page, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl hover:from-pink-100 hover:to-purple-100 transition-all duration-300">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-sm font-bold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {getPageDisplayName(page.page_path)}
                    </span>
                    <span className="ml-2 text-xs text-pink-600 font-medium">
                      {page.page_path}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center space-x-4">
                    <span className="text-sm text-gray-600 font-medium">
                      👁️ {page.views} views
                    </span>
                    <span className="text-sm text-gray-600 font-medium">
                      ⏱️ Avg: {formatDuration(page.avg_duration)}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-32 bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-pink-500 to-purple-600 h-3 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, (page.views / Math.max(...(analytics?.pageViews?.map(p => p.views) || [1]))) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
      </div>

      {/* Daily Visits Chart */}
      <div className="card p-6">
        <h3 className="text-xl font-bold gradient-text mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
          📈 Daily Visits (Last 30 Days)
        </h3>
        <div className="space-y-2">
          {analytics?.dailyVisits?.slice(0, 10).map((day, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all duration-300">
              <span className="text-sm text-gray-700 font-medium">
                📅 {new Date(day.date).toLocaleDateString()}
              </span>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold text-gray-800">
                  {day.visits}
                </span>
                <div className="w-24 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full" 
                    style={{ 
                      width: `${Math.min(100, (day.visits / Math.max(...(analytics?.dailyVisits?.map(d => d.visits) || [1]))) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Referrers */}
      {analytics?.topReferrers && analytics.topReferrers.length > 0 && (
        <div className="card p-6">
          <h3 className="text-xl font-bold gradient-text mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
            🌐 Top Referrers
          </h3>
          <div className="space-y-4">
            {analytics.topReferrers.map((referrer, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl hover:from-green-100 hover:to-emerald-100 transition-all duration-300">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mr-3">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-gray-800 font-medium truncate max-w-xs">
                    {referrer.referrer}
                  </span>
                </div>
                <span className="text-sm font-bold text-green-700 px-3 py-1 bg-green-100 rounded-full">
                  {referrer.visits} visits
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Analytics
