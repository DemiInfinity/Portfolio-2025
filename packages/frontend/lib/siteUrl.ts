/** Canonical site origin, from NEXT_PUBLIC_SITE_URL (never window.location, so it works on the server). */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://demitaylornimmo.com').replace(/\/$/, '')
}

/** Absolute canonical URL for a site path, e.g. siteUrl('/blog/x'). */
export function siteUrl(path = '/'): string {
  return `${siteOrigin()}${path.startsWith('/') ? path : `/${path}`}`
}

/** Site-wide default Open Graph image (1200×630, in public/). */
export const DEFAULT_OG_IMAGE = '/og-default.png'
