/**
 * Resolve image URLs for content served from the API (e.g. /uploads/...) or any absolute URL.
 *
 * D-14 (no third-party cookie before consent): Supabase public-storage URLs are
 * rewritten to this site's own `/media/<project ref>/<path>` route
 * (app/media/[ref]/[...path]/route.ts), so the visitor's browser never contacts
 * supabase.co and never receives its Cloudflare `__cf_bm` cookie.
 */
export function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL
  if (typeof raw === 'string' && raw.trim()) {
    return raw.replace(/\/$/, '')
  }
  return 'https://api.demitaylornimmo.com'
}

const SUPABASE_PUBLIC = /^https?:\/\/([a-z0-9]{6,40})\.supabase\.co\/storage\/v1\/object\/public\/(.+)$/i

/** `/media/<ref>/<path>` for a Supabase public-storage URL, otherwise null. */
export function toMediaPath(url: string): string | null {
  const match = SUPABASE_PUBLIC.exec(url)
  if (!match) return null
  return `/media/${match[1].toLowerCase()}/${match[2]}`
}

export function resolveMediaUrl(src: string | undefined | null): string {
  if (src == null || src === '') return ''
  const s = String(src).trim()
  if (!s) return ''
  const absolute = s.startsWith('//') ? `https:${s}` : s
  if (absolute.startsWith('http://') || absolute.startsWith('https://')) return toMediaPath(absolute) ?? absolute
  const path = s.startsWith('/') ? s : `/${s}`
  return `${getApiOrigin()}${path}`
}

/** Robots header for every PDF served through /media (the generated CV): D-5. */
export const PDF_ROBOTS = 'noindex, nofollow, noarchive'
/** Download name for the generated CV. */
export const CV_FILENAME = 'Demi-Taylor-Nimmo-CV.pdf'
