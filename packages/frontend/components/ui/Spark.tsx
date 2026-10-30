import type { CSSProperties } from 'react'

export const SPARK_PATH = 'M12 0c.6 6.2 5.8 11.4 12 12-6.2.6-11.4 5.8-12 12-.6-6.2-5.8-11.4-12-12C6.2 11.4 11.4 6.2 12 0z'

/** The four-point spark from the designs. Decorative by default. */
export default function Spark({
  className,
  style,
  size,
}: {
  className?: string
  style?: CSSProperties
  size?: number
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      width={size}
      height={size}
      style={style}
    >
      <path d={SPARK_PATH} fill="currentColor" />
    </svg>
  )
}
