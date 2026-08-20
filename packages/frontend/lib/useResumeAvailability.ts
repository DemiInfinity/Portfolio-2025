import { useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'https://api.demitaylornimmo.com/api'

/**
 * Checks whether a CV/resume has been uploaded via the admin dashboard.
 * The uploaded file's existence is the source of truth (not a separately
 * toggled flag), so this can never drift out of sync with what's actually
 * been uploaded.
 */
export function useResumeAvailability(): { available: boolean; url: string | null; isLoading: boolean } {
  const [available, setAvailable] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/upload/resume`)
        if (!response.ok) throw new Error(`Resume availability check failed: ${response.status}`)
        const data = await response.json()
        if (!cancelled) {
          setAvailable(Boolean(data.available))
          setUrl(data.url ?? null)
        }
      } catch (error) {
        console.error('Error checking resume availability:', error)
        if (!cancelled) {
          setAvailable(false)
          setUrl(null)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [])

  return { available, url, isLoading }
}
