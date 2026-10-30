'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { useMaintenanceMode } from '../lib/useMaintenanceMode'
import MaintenancePage from './MaintenancePage'
import { MAINTENANCE_EXEMPT, matchesRoute } from '../lib/routes'

interface MaintenanceWrapperProps {
  children: React.ReactNode
}

const MaintenanceWrapper: React.FC<MaintenanceWrapperProps> = ({ children }) => {
  const { isMaintenanceMode, isLoading, error } = useMaintenanceMode()
  const pathname = usePathname()
  // Legal pages and the generated CV never show the maintenance page.
  const isExempt = matchesRoute(pathname, MAINTENANCE_EXEMPT)

  // Only show the maintenance page once maintenance mode is confirmed enabled;
  // never during loading or on error (fail-safe).
  const showMaintenance = !isLoading && !error && isMaintenanceMode

  // Show maintenance page only if maintenance mode is confirmed enabled
  if (showMaintenance && !isExempt) {
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
