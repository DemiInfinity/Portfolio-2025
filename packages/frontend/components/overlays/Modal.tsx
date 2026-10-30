'use client'

import { useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useOverlayBehaviour } from './useOverlayBehaviour'

type ModalProps = {
  /** id of the element that names the dialog. */
  labelledBy: string
  onClose: () => void
  children: ReactNode
  panelStyle?: CSSProperties
  /** When false, focus is not restored on unmount (used when one overlay hands over to another). */
  returnFocus?: boolean
}

/**
 * Backdrop fades in over 260ms; the panel rises and scales from 95% over
 * 520ms (Interactions "Motion rules: Overlays"). Mount it to open it.
 */
export default function Modal({ labelledBy, onClose, children, panelStyle, returnFocus }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useOverlayBehaviour(panelRef, onClose, { returnFocus })

  return (
    <div
      className="ov-backdrop"
      data-testid="overlay-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className="ov-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        style={panelStyle}
      >
        {children}
      </div>
    </div>
  )
}
