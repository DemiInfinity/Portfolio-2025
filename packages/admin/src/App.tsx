import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/Layout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { navFor, NAV } from '@/lib/nav'
import Login from '@/pages/Login'
import Dashboard from './pages/Dashboard'
import About from './pages/About'
import Messages from './pages/Messages'
import Projects from './pages/Projects'
import Learning from './pages/Learning'
import WorkHistory from './pages/WorkHistory'
import Education from './pages/Education'
import Certifications from './pages/Certifications'
import Blog from './pages/Blog'
import Analytics from './pages/Analytics'
import FeatureFlags from './pages/FeatureFlags'
import Settings from './pages/Settings'

/** "{Page} | Admin | Demi Taylor Nimmo", with the nav's sentence-case labels. */
export const documentTitle = (pathname: string, signedIn: boolean) =>
  `${signedIn ? (NAV.some((n) => n.path === pathname) ? navFor(pathname).label : 'Dashboard') : 'Sign in'} | Admin | Demi Taylor Nimmo`

function App() {
  const { user, loading } = useAuth()
  const location = useLocation()

  useEffect(() => {
    document.title = documentTitle(location.pathname, !!user)
  }, [location.pathname, user])

  if (loading) return <LoadingSpinner />
  if (!user) return <Login />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/about" element={<About />} />
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
