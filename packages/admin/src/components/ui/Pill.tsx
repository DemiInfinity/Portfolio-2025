import type { ReactNode } from 'react'

export type PillTone = 'live' | 'draft' | 'hue' | 'off' | 'neg'

export default function Pill({ tone, dot = false, children, className = '' }: { tone: PillTone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={`pill p-${tone} ${className}`.trim()}>
      {dot ? <span className="dot" /> : null}
      {children}
    </span>
  )
}
