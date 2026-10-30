export const MAIN_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'Experience', href: '/experience' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
] as const

/** True when `href` is the current section: `/projects/*` marks Projects, `/blog/*` marks Blog. */
export function isActivePath(pathname: string | null | undefined, href: string): boolean {
  const path = (pathname || '/').replace(/\/+$/, '') || '/'
  if (href === '/') return path === '/'
  return path === href || path.startsWith(`${href}/`)
}
