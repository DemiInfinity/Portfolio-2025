'use client'

import ErrorView from '@/components/ErrorView'
import type { ErrorBoundaryProps } from '@/components/ErrorView'

/** 500 inside the site chrome (Error.dc.html). Root-layout failures go to global-error.tsx. */
export default function Error(props: ErrorBoundaryProps) {
  return <ErrorView {...props} />
}
