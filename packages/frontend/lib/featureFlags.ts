export const SHOW_MARBL_FLAG = 'show_marbl'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'https://api.demitaylornimmo.com/api'

/** Server-side public flag read. Missing/failed flags are disabled. */
export async function fetchPublicFeatureFlag(name: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/feature-flags/public/${encodeURIComponent(name)}`,
      { cache: 'no-store' }
    )
    if (!response.ok) return false
    const data = await response.json()
    return Boolean(data.enabled)
  } catch (error) {
    console.error(`Error checking feature flag "${name}":`, error)
    return false
  }
}
