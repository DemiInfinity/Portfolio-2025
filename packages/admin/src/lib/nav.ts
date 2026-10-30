import type { IconName } from '@/components/ui/Icon'

export type NavItem = { label: string; path: string; icon: IconName; placeholder: string; group: 'top' | 'Content' | 'Site' }

export const NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: 'dashboard', placeholder: 'Search projects, posts and roles', group: 'top' },
  { label: 'About', path: '/about', icon: 'about', placeholder: 'Search recommendations', group: 'Content' },
  { label: 'Projects', path: '/projects', icon: 'projects', placeholder: 'Search projects', group: 'Content' },
  { label: 'Blog', path: '/blog', icon: 'blog', placeholder: 'Search posts', group: 'Content' },
  { label: 'Work history', path: '/work-history', icon: 'work', placeholder: 'Search roles and companies', group: 'Content' },
  { label: 'Education', path: '/education', icon: 'education', placeholder: 'Search education', group: 'Content' },
  { label: 'Certifications', path: '/certifications', icon: 'certifications', placeholder: 'Search certifications', group: 'Content' },
  { label: 'Learning', path: '/learning', icon: 'learning', placeholder: 'Search courses and skills', group: 'Content' },
  { label: 'Analytics', path: '/analytics', icon: 'analytics', placeholder: 'Search pages', group: 'Site' },
  { label: 'Feature flags', path: '/feature-flags', icon: 'flags', placeholder: 'Search flags', group: 'Site' },
  { label: 'Settings', path: '/settings', icon: 'settings', placeholder: 'Search settings', group: 'Site' },
]

export const navFor = (pathname: string): NavItem => NAV.find((n) => n.path === pathname) || NAV[0]
