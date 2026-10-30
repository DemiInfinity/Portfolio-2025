import type { Metadata } from 'next'
import InfinityMark from '@/components/ui/InfinityMark'
import Button from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'Page not found',
}

export default function NotFound() {
  return (
    <div className="state-frame">
      <InfinityMark width={120} animated={false} />
      <h1 className="serif" style={{ fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 1.05 }}>
        Page <span className="script grad-text" style={{ fontSize: '1.15em', paddingRight: '.1em' }}>not found</span>
      </h1>
      <p style={{ fontSize: 'var(--t-lead)', lineHeight: 1.6, maxWidth: '40ch' }}>
        That page doesn’t exist, or it has moved.
      </p>
      <Button href="/">Back to home</Button>
    </div>
  )
}
