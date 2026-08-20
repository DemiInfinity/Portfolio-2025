import { useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'https://api.demitaylornimmo.com/api'

/**
 * Reads a single named feature flag via the public /feature-flags/public/:name
 * endpoint. Defaults to false while loading and on error/missing flag - the
 * same fail-safe default the backend itself applies for an unknown flag name.
 */
export function useFeatureFlag(name: string): { enabled: boolean; isLoading: boolean } {
  const [enabled, setEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/feature-flags/public/${encodeURIComponent(name)}`)
        if (!response.ok) throw new Error(`Feature flag check failed: ${response.status}`)
        const data = await response.json()
        if (!cancelled) setEnabled(Boolean(data.enabled))
      } catch (error) {
        console.error(`Error checking feature flag "${name}":`, error)
        if (!cancelled) setEnabled(false)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [name])

  return { enabled, isLoading }
}
