'use client'

import ErrorView from '@/components/ErrorView'
import type { ErrorBoundaryProps } from '@/components/ErrorView'
import { ROUTE_ERRORS } from '@/lib/routeErrors'

export default function Error(props: ErrorBoundaryProps) {
  return <ErrorView {...props} {...ROUTE_ERRORS.about} />
}
