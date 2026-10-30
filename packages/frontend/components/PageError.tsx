'use client'

import InfinityMark from '@/components/ui/InfinityMark'
import Button from '@/components/ui/Button'

/**
 * Shared error state for route error.tsx boundaries, in the loader's frame.
 * A failed or sleeping backend is visible and retryable, never a blank page.
 */
export default function PageError({
  title = 'Couldn’t load this page',
  message = 'The server naps when nobody’s around, so it may just need a moment to wake up. Try again in a few seconds.',
  reset,
  inline = false,
  headingLevel = 1,
  retryLabel = 'Try again',
}: {
  title?: string
  message?: string
  reset?: () => void
  /** Inline block inside a page (Home "Recent work"), without "Back to home". */
  inline?: boolean
  headingLevel?: 1 | 2 | 3
  retryLabel?: string
}) {
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3'
  return (
    <div className={inline ? 'state-frame state-inline' : 'state-frame'} role={inline ? 'alert' : undefined}>
      <InfinityMark width={120} animated={false} />
      <Heading className="serif" style={{ fontSize: 'clamp(28px, 3vw, 40px)', color: 'var(--b2)', lineHeight: 1.15 }}>
        {title}
      </Heading>
      <p style={{ fontSize: 'var(--t-meta)', lineHeight: 1.6, maxWidth: '48ch' }}>{message}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {reset && <Button onClick={() => reset()}>{retryLabel}</Button>}
        {!inline && (
          <Button href="/" variant="line">
            Back to home
          </Button>
        )}
      </div>
    </div>
  )
}
