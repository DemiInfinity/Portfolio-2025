import { useState, useEffect } from 'react'

interface FeatureFlag {
  id: number
  name: string
  description: string
  enabled: boolean
  created_at: string
  updated_at: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/api` 
  : 'https://api.demitaylornimmo.com/api'

// Global state to track if we've already checked maintenance mode in this session
let hasCheckedMaintenance = false
let maintenanceState = {
  isMaintenanceMode: false,
  isLoading: true,
  error: null as string | null
}

export const useMaintenanceMode = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(maintenanceState.isMaintenanceMode)
  const [isLoading, setIsLoading] = useState(maintenanceState.isLoading)
  const [error, setError] = useState<string | null>(maintenanceState.error)

  useEffect(() => {
    // Already checked in this browser session: the state was initialised from the cache.
    if (hasCheckedMaintenance) return

    const checkMaintenanceMode = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${API_BASE_URL}/feature-flags/maintenance`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch maintenance mode')
        }

        const data = await response.json()
        const maintenanceMode = data.maintenance_mode || false
        
        // Update both local state and global cache
        setIsMaintenanceMode(maintenanceMode)
        maintenanceState.isMaintenanceMode = maintenanceMode
        maintenanceState.error = null
      } catch (err) {
        console.error('Error checking maintenance mode:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        maintenanceState.error = errorMessage
        // Default to false if we can't check the flag
        setIsMaintenanceMode(false)
        maintenanceState.isMaintenanceMode = false
      } finally {
        setIsLoading(false)
        maintenanceState.isLoading = false
        hasCheckedMaintenance = true
      }
    }

    // Only check maintenance mode once per browser session
    checkMaintenanceMode()
  }, [])

  return {
    isMaintenanceMode,
    isLoading,
    error
  }
}
