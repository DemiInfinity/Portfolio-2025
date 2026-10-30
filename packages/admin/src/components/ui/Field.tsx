import { useId, type CSSProperties, type ReactNode } from 'react'

export type ControlProps = {
  id: string
  className: string
  'aria-invalid': boolean
  'aria-describedby'?: string
}

type Props = {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  span2?: boolean
  className?: string
  style?: CSSProperties
  /** Extra class names for the control (e.g. `mono`, `code`, `num`). */
  controlClass?: string
  children: (p: ControlProps) => ReactNode
  /** Rendered after the hint (e.g. live chips). */
  after?: ReactNode
}

/**
 * label + control + hint/err-text. The error replaces nothing: it shows under the control,
 * and the control gets `.err`, `aria-invalid` and `aria-describedby`.
 */
export default function Field({ label, hint, error, span2, className = '', style, controlClass = '', children, after }: Props) {
  const id = useId()
  const hintId = hint ? id + '-h' : undefined
  const errId = error ? id + '-e' : undefined
  const describedBy = [errId, hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className={['field', span2 ? 'span2' : '', className].filter(Boolean).join(' ')} style={style}>
      <label htmlFor={id}>{label}</label>
      {children({
        id,
        className: ['input', controlClass, error ? 'err' : ''].filter(Boolean).join(' '),
        'aria-invalid': !!error,
        'aria-describedby': describedBy,
      })}
      {error ? <span id={errId} className="err-text">{error}</span> : null}
      {hint ? <span id={hintId} className="hint">{hint}</span> : null}
      {after}
    </div>
  )
}
