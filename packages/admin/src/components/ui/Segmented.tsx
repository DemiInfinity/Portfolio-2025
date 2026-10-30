import type { CSSProperties } from 'react'

export type SegOption<T extends string> = { value: T; label: string; count?: number }

type Props<T extends string> = {
  options: SegOption<T>[]
  value: T
  onChange: (v: T) => void
  'aria-label'?: string
  'aria-labelledby'?: string
  style?: CSSProperties
}

export default function Segmented<T extends string>({ options, value, onChange, style, ...aria }: Props<T>) {
  return (
    <div className="seg" role="group" aria-label={aria['aria-label']} aria-labelledby={aria['aria-labelledby']} style={style}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} aria-label={o.count !== undefined ? `${o.label} ${o.count}` : undefined} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined ? <span className="n">{o.count}</span> : null}
        </button>
      ))}
    </div>
  )
}
