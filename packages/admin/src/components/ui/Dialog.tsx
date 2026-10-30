import { useId, useRef, type FormEvent, type ReactNode, type RefObject } from 'react'
import Icon from './Icon'
import { useModal } from './useModal'

type Props = {
  title: ReactNode
  sub?: ReactNode
  onClose: () => void
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void
  /** While saving, the scrim, Esc and Close do nothing. */
  saving?: boolean
  size?: 'default' | 'wide' | 'slim'
  maxWidth?: number
  footer?: ReactNode
  children: ReactNode
  initialFocus?: RefObject<HTMLElement | null>
}

const WIDTH = { default: undefined, wide: 860, slim: undefined } as const

export default function Dialog({ title, sub, onClose, onSubmit, saving = false, size = 'default', maxWidth, footer, children, initialFocus }: Props) {
  const ref = useRef<HTMLFormElement>(null)
  const titleId = useId()
  const close = () => {
    if (!saving) onClose()
  }
  useModal(ref, { onClose, blocked: saving, initial: initialFocus })
  const w = maxWidth ?? WIDTH[size]
  return (
    <div className="scrim" onClick={close}>
      <form
        ref={ref}
        className={'dialog' + (size === 'slim' ? ' slim' : '')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        noValidate
        style={w ? { maxWidth: w } : undefined}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit?.(e)
        }}
      >
        <div className="dlg-head">
          <div>
            <h2 id={titleId} className="dlg-title">{title}</h2>
            {sub ? <p className="mute" style={{ fontSize: 13 }}>{sub}</p> : null}
          </div>
          <button type="button" className="iconbtn" onClick={close} aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="dlg-body">{children}</div>
        {footer ? <div className="dlg-foot">{footer}</div> : null}
      </form>
    </div>
  )
}

/** The primary submit button with the design's saving state. */
export function SaveButton({ saving, label, className = 'btn btn-primary' }: { saving: boolean; label: string; className?: string }) {
  return (
    <button type="submit" className={className} disabled={saving}>
      {saving ? <span className="spin" aria-hidden="true" /> : null}
      {saving ? 'Saving' : label}
    </button>
  )
}
