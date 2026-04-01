/**
 * Resolve image URLs for content served from the API (e.g. /uploads/...) or any absolute URL.
 */
export function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL
  if (typeof raw === 'string' && raw.trim()) {
    return raw.replace(/\/$/, '')
  }
  return 'https://api.demitaylornimmo.com'
}

export function resolveMediaUrl(src: string | undefined | null): string {
  if (src == null || src === '') return ''
  const s = String(src).trim()
  if (!s) return ''
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.startsWith('//')) return `https:${s}`
  const path = s.startsWith('/') ? s : `/${s}`
  return `${getApiOrigin()}${path}`
}
