import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { 
  LayoutDashboard, 
  Briefcase, 
  BookOpen, 
  Clock, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  GraduationCap,
  Award,
  BarChart3,
  Flag
} from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: Briefcase },
    { name: 'Learning', href: '/learning', icon: BookOpen },
    { name: 'Work History', href: '/work-history', icon: Clock },
    { name: 'Education', href: '/education', icon: GraduationCap },
    { name: 'Certifications', href: '/certifications', icon: Award },
    { name: 'Blog', href: '/blog', icon: FileText },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Feature Flags', href: '/feature-flags', icon: Flag },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8f4ff 0%, #fff8f0 100%)' }}>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-pink-600 bg-opacity-30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col sidebar-girly pt-6">
          <div className="flex h-24 items-center justify-between px-6 mt-4">
            <div className="flex flex-col items-center justify-center flex-1">
              <img
                src="/brand-logo.png"
                alt="Demi Taylor Nimmo"
                className="h-16 w-auto max-w-[200px] object-contain mb-2"
              />
              <span className="text-sm font-bold gradient-text" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Admin Panel
              </span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-full hover:bg-pink-100 transition-colors absolute top-4 right-4"
            >
              <X className="w-5 h-5 text-pink-600" />
            </button>
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-300 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-pink-50 hover:text-pink-600 hover:transform hover:scale-105'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-pink-200 p-4">
            <button
              onClick={logout}
              className="group flex w-full items-center px-4 py-3 text-sm font-medium text-gray-600 rounded-2xl hover:bg-pink-50 hover:text-pink-600 transition-all duration-300"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow sidebar-girly pt-8">
          <div className="flex flex-col items-center justify-center h-24 px-6 mt-4">
            <img
              src="/brand-logo.png"
              alt="Demi Taylor Nimmo"
              className="h-16 w-auto max-w-[200px] object-contain mb-2"
            />
            <span className="text-sm font-bold gradient-text" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Admin Panel
            </span>
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-300 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-pink-50 hover:text-pink-600 hover:transform hover:scale-105'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-pink-200 p-4">
            <div className="flex items-center mb-4 p-3 rounded-2xl bg-white bg-opacity-50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0) || '👤'}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="group flex w-full items-center px-4 py-3 text-sm font-medium text-gray-600 rounded-2xl hover:bg-pink-50 hover:text-pink-600 transition-all duration-300"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 header-girly px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-pink-600 lg:hidden hover:bg-pink-100 rounded-full transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center justify-end">
              <div className="floating-hearts relative">
                <span className="text-sm text-gray-600">Welcome back, {user?.name}! 💖</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
