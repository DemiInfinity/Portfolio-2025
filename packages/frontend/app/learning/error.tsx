'use client'

import ErrorView from '@/components/ErrorView'
import type { ErrorBoundaryProps } from '@/components/ErrorView'

export default function Error(props: ErrorBoundaryProps) {
  return <ErrorView {...props} title="Couldn't load the learning journey" message="We couldn’t reach the server to load learning progress and skills. The server naps when nobody’s around, so it may just need a moment to wake up. Try again in a few seconds." />
}
