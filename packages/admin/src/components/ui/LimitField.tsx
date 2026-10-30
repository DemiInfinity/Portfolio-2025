import type { ReactNode } from 'react'
import Field from './Field'

type Props = {
  label: ReactNode
  value: string
  onChange: (v: string) => void
  max: number
  error?: string | null
  hint?: ReactNode
  span2?: boolean
  multiline?: boolean
  rows?: number
  code?: boolean
  placeholder?: string
  type?: string
  inputRef?: (el: HTMLInputElement | HTMLTextAreaElement | null) => void
  name?: string
}

/** A text field with a "{n} of {max}" counter that turns into "Keep this under {max} characters." when over. */
export default function LimitField({ label, value, onChange, max, error, hint, span2, multiline, rows = 3, code, placeholder, type, inputRef, name }: Props) {
  const n = value.length
  const over = n > max
  const err = error || (over ? `Keep this under ${max} characters.` : null)
  const counter = <span className="num">{n} of {max}</span>
  return (
    <Field label={label} span2={span2} error={err} controlClass={code ? 'code' : ''} hint={hint ? <>{hint} {counter}</> : counter}>
      {(p) =>
        multiline ? (
          <textarea {...p} ref={inputRef} name={name} rows={rows} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input {...p} ref={inputRef} name={name} type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
        )
      }
    </Field>
  )
}
