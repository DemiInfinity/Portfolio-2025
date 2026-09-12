'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useMaintenanceMode } from '../lib/useMaintenanceMode'
import MaintenancePage from './MaintenancePage'

interface MaintenanceWrapperProps {
  children: React.ReactNode
}

const MaintenanceWrapper: React.FC<MaintenanceWrapperProps> = ({ children }) => {
  const { isMaintenanceMode, isLoading, error } = useMaintenanceMode()
  const [showMaintenance, setShowMaintenance] = useState(false)
  const pathname = usePathname()
  const isLegalPage = pathname === '/privacy' || pathname === '/terms'

  // Check maintenance mode in the background without blocking initial render
  useEffect(() => {
    // Only show maintenance page if maintenance mode is confirmed enabled
    // Don't show during loading or on error (fail-safe approach)
    if (!isLoading && !error && isMaintenanceMode) {
      setShowMaintenance(true)
    } else {
      setShowMaintenance(false)
    }
  }, [isMaintenanceMode, isLoading, error])

  // Show maintenance page only if maintenance mode is confirmed enabled
  if (showMaintenance && !isLegalPage) {
    return (
      <MaintenancePage 
        estimatedTime="a few hours"
        message="We're currently performing scheduled maintenance to improve your experience. We'll be back soon!"
      />
    )
  }

  // Always show normal site during loading or on error (fail-safe)
  return <>{children}</>
}

export default MaintenanceWrapper
