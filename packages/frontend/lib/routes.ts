/** Routes rendered without the site header, footer and overlays (F-10). */
export const BARE_ROUTES = ['/cv']

/** Routes that never show the maintenance page and never record analytics. */
export const MAINTENANCE_EXEMPT = ['/privacy', '/terms', '/cv']
export const ANALYTICS_EXEMPT = ['/cv']

export function matchesRoute(pathname: string | null | undefined, routes: string[]): boolean {
  const path = (pathname || '/').replace(/\/+$/, '') || '/'
  return routes.some((route) => path === route || path.startsWith(`${route}/`))
}
