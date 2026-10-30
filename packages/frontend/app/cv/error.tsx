'use client'

import { useEffect } from 'react'
import PageError from '@/components/PageError'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <PageError title="Couldn't load the CV" reset={reset} />
}
