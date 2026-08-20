'use client'

import { useEffect } from 'react'
import PageError from '@/components/PageError'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <PageError
      title="Couldn't load the learning journey"
      message="We couldn't reach the server to load learning progress and skills. It's hosted on Railway and naps when idle, so it may just need a moment to wake up - try again in a few seconds."
      reset={reset}
    />
  )
}
