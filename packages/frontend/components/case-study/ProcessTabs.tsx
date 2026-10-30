'use client'

import { useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import Markdown from '@/components/Markdown'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import type { NormalisedCaseStudy } from './caseStudy'

/** Process phases as tabs (CaseStudy "Process"). Arrow keys move between tabs. */
export default function ProcessTabs({ phases }: { phases: NormalisedCaseStudy['process'] }) {
  const [active, setActive] = useState(0)
  const baseId = useId()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const phase = phases[active]

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1
    if (event.key === 'ArrowRight') next = (index + 1) % phases.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + phases.length) % phases.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = phases.length - 1
    if (next === -1) return
    event.preventDefault()
    setActive(next)
    tabs.current[next]?.focus()
  }

  const image = resolveMediaUrl(phase.image)

  return (
    <>
      <div role="tablist" aria-label="Process phases" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {phases.map((p, i) => (
          <button
            key={`${p.label}-${i}`}
            ref={(el) => {
              tabs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${i}`}
            aria-selected={i === active}
            aria-controls={`${baseId}-panel`}
            tabIndex={i === active ? 0 : -1}
            className="cs-tab"
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div
        key={active}
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${active}`}
        className={image ? 'cs-swap cs-two' : 'cs-swap'}
        style={{ background: '#fff', borderRadius: 28, padding: 'clamp(24px, 3vw, 40px)', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 className="serif" style={{ fontSize: 32 }}>{phase.title}</h3>
          <Markdown>{phase.body}</Markdown>
        </div>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={phase.imageAlt} loading="lazy" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 24, display: 'block' }} />
        )}
      </div>
    </>
  )
}
