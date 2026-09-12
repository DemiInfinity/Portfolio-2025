'use client'

import { useEffect, useState } from 'react'
import { isAnalyticsOptedOut, setAnalyticsOptOut } from '@/lib/analytics'

export default function WebsiteAnalyticsChoice() {
  const [optedOut, setOptedOut] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setOptedOut(isAnalyticsOptedOut())
    setReady(true)
  }, [])

  if (!ready) {
    return <p>Checking your analytics preference…</p>
  }

  return (
    <div className="mb-6">
      <p>
        {optedOut
          ? 'Site analytics are off in this browser. We will not send new page-visit records from this device unless you turn them back on.'
          : 'Site analytics are on in this browser. You can turn them off here. This preference is stored on your device so we can honour it.'}
      </p>
      <button
        type="button"
        className="btn-secondary text-sm px-4 py-2 mt-2"
        onClick={() => {
          const next = !optedOut
          setAnalyticsOptOut(next)
          setOptedOut(next)
        }}
      >
        {optedOut ? 'Turn site analytics on' : 'Turn site analytics off'}
      </button>
    </div>
  )
}
