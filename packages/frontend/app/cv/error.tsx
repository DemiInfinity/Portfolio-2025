'use client'

import ErrorView from '@/components/ErrorView'
import type { ErrorBoundaryProps } from '@/components/ErrorView'

export default function Error(props: ErrorBoundaryProps) {
  return <ErrorView {...props} title="Couldn't load the CV" />
}
