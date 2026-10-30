import { useId } from 'react'

const PATH = 'M60 40 C75 18 108 18 108 40 C108 62 75 62 60 40 C45 18 12 18 12 40 C12 62 45 62 60 40 Z'

/** The infinity loader from Interactions ("Waking the server…"). `animated` draws the moving stroke. */
export default function InfinityMark({ width = 160, animated = true }: { width?: number; animated?: boolean }) {
  const gradientId = useId()
  return (
    <svg width={width} height={(width * 90) / 160} viewBox="0 0 128 72" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f472b6" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path d={PATH} fill="none" stroke="#e9d5ff" strokeWidth="10" strokeLinecap="round" />
      <path
        className={animated ? 'loader-inf' : undefined}
        d={PATH}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={animated ? undefined : '60 240'}
      />
    </svg>
  )
}
