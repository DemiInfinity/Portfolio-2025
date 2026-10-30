import { useId, useRef, type ReactNode } from 'react'
import { useModal } from './useModal'

type Props = {
  title: ReactNode
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** `btn-negfill` for destructive confirms, `btn-primary` otherwise. */
  tone?: 'danger' | 'primary'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ title, description, confirmLabel, cancelLabel = 'Keep it', tone = 'danger', busy = false, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const keep = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descId = useId()
  useModal(ref, { onClose: onCancel, blocked: busy, initial: keep })
  return (
    <div className="scrim" style={{ zIndex: 66 }} onClick={() => !busy && onCancel()}>
      <div
        ref={ref}
        className="dialog slim"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dlg-body" style={{ paddingTop: 24 }}>
          <h2 id={titleId} className="dlg-title">{title}</h2>
          <p id={descId} className="mute" style={{ marginTop: 8 }}>{description}</p>
        </div>
        <div className="dlg-foot">
          <button ref={keep} type="button" className="btn btn-line" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button type="button" className={'btn ' + (tone === 'danger' ? 'btn-negfill' : 'btn-primary')} onClick={onConfirm} disabled={busy}>
            {busy ? <span className="spin" aria-hidden="true" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
