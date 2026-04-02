import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Learning from './pages/Learning'
import WorkHistory from './pages/WorkHistory'
import Education from './pages/Education'
import Certifications from './pages/Certifications'
import Blog from './pages/Blog'
import Analytics from './pages/Analytics'
import FeatureFlags from './pages/FeatureFlags'
import Settings from './pages/Settings'
import LoadingSpinner from '@/components/LoadingSpinner'

function App() {
  const { user, loading } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname
    const pageTitleMap: Record<string, string> = {
      '/': 'Dashboard',
      '/projects': 'Projects',
      '/learning': 'Learning',
      '/work-history': 'Work History',
      '/education': 'Education',
      '/certifications': 'Certifications',
      '/blog': 'Blog',
      '/analytics': 'Analytics',
      '/feature-flags': 'Feature Flags',
      '/settings': 'Settings',
    }

    const page = !user ? 'Login' : (pageTitleMap[path] || 'Dashboard')
    document.title = `${page} | Admin | Demi Taylor Nimmo`
  }, [location.pathname, user])

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/work-history" element={<WorkHistory />} />
        <Route path="/education" element={<Education />} />
        <Route path="/certifications" element={<Certifications />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/feature-flags" element={<FeatureFlags />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
