'use client'

import { RefreshCw, WifiOff } from 'lucide-react'
import Link from 'next/link'

/**
 * Shared error state for pages that fetch from the backend. Used from
 * route-level error.tsx boundaries so a failed/asleep backend never falls
 * through to a silently-empty page - it's visible, and retryable.
 */
export default function PageError({
  title = "Couldn't load this page",
  message = "We couldn't reach the server. It's hosted on Railway and naps when idle, so it may just need a moment to wake up.",
  reset,
}: {
  title?: string
  message?: string
  reset?: () => void
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center py-20"
      style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #f8f4ff 50%, #fff8f0 100%)' }}
    >
      <div className="card p-10 text-center max-w-md mx-4">
        <div className="w-16 h-16 bg-gradient-to-r from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-8 h-8 text-pink-500" />
        </div>
        <h1 className="text-2xl font-bold gradient-text mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
          {title} 😔
        </h1>
        <p className="text-gray-600 font-medium mb-8">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {reset && (
            <button onClick={() => reset()} className="btn-primary justify-center">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          )}
          <Link href="/" className="btn-secondary justify-center">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
