import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** Static chip (technology chips). `dark` is the translucent chip on dark panels. */
export function Chip({ children, dark, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return <span className={['chip', dark && 'chip-dark', className].filter(Boolean).join(' ')}>{children}</span>
}

/** Small label tag, e.g. "Featured" or a post category. */
export function Tag({ children, fill }: { children: ReactNode; fill?: boolean }) {
  return <span className={fill ? 'tag tag-fill' : 'tag'}>{children}</span>
}

/** Stat pill ("−80% manual update effort"). */
export function Stat({ children }: { children: ReactNode }) {
  return <span className="stat">{children}</span>
}

type ChipButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> & {
  pressed: boolean
  /** Filter chips use the gradient fill when pressed. */
  filter?: boolean
}

/** Toggle chip with aria-pressed (Hire me "I'm getting in touch about", blog filters). */
export function ChipButton({ pressed, filter, className, type, ...rest }: ChipButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      aria-pressed={pressed}
      className={['chipbtn', filter && 'chip-filter', className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}
