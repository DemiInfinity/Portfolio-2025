'use client'

import { useState, useSyncExternalStore } from 'react'
import { isAnalyticsOptedOut, setAnalyticsOptOut } from '@/lib/analytics'

const noop = () => () => {}

export default function WebsiteAnalyticsChoice() {
  // null on the server and the first client render, then the stored choice.
  const stored = useSyncExternalStore(noop, isAnalyticsOptedOut, () => null)
  const [changed, setChanged] = useState<boolean | null>(null)
  const optedOut = changed ?? stored
  const setOptedOut = setChanged

  if (optedOut === null) {
    return <p>Checking your analytics preference…</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
      <p>
        {optedOut
          ? 'Site analytics are off in this browser. We will not send new page-visit records from this device unless you turn them back on.'
          : 'Site analytics are on in this browser. You can turn them off here. This preference is stored on your device so we can honour it.'}
      </p>
      <button
        type="button"
        className="btn btn-soft btn-sm"
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
