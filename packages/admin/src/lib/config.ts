const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env || {}

export const SITE_URL = (env.VITE_SITE_URL || 'https://www.demitaylornimmo.com').replace(/\/$/, '')
export const API_ORIGIN = (env.VITE_API_URL || 'https://api.demitaylornimmo.com').replace(/\/$/, '')

export const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}
