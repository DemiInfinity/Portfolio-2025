import type { CSSProperties, ReactNode } from 'react'

type Props = {
  checked: boolean
  onChange: (next: boolean) => void
  children?: ReactNode
  'aria-label'?: string
  className?: string
  style?: CSSProperties
  disabled?: boolean
}

/** `button.sw-row[role=switch]` holding its label, with a `.sw` track. */
export default function Switch({ checked, onChange, children, className = '', style, disabled, ...rest }: Props) {
  return (
    <button
      type="button"
      className={('sw-row ' + className).trim()}
      role="switch"
      aria-checked={checked}
      aria-label={rest['aria-label']}
      onClick={() => onChange(!checked)}
      style={style}
      disabled={disabled}
    >
      {children}
      <span className="sw" aria-hidden="true" />
    </button>
  )
}
