'use client'

import ErrorView from '@/components/ErrorView'
import type { ErrorBoundaryProps } from '@/components/ErrorView'

export default function Error(props: ErrorBoundaryProps) {
  return <ErrorView {...props} title="Couldn't load the blog" message="We couldn’t reach the server to load this blog content. The server naps when nobody’s around, so it may just need a moment to wake up. Try again in a few seconds." />
}
