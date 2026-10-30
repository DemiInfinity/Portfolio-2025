import Link from 'next/link'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'fill' | 'line' | 'soft' | 'light'

type Common = {
  variant?: ButtonVariant
  size?: 'default' | 'sm'
  block?: boolean
  loading?: boolean
  className?: string
  children: ReactNode
}

type AsLink = Common & { href: string; external?: boolean } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>
type AsButton = Common & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>

export type ButtonProps = AsLink | AsButton

function classes({ variant = 'fill', size = 'default', block, loading, className }: Common) {
  return ['btn', `btn-${variant}`, size === 'sm' && 'btn-sm', block && 'btn-block', loading && 'btn-loading', className]
    .filter(Boolean)
    .join(' ')
}

/** Design "Buttons": renders a link when given `href`, otherwise `<button type="button">`. */
export default function Button(props: ButtonProps) {
  const { variant, size, block, loading, className, children } = props
  const cls = classes({ variant, size, block, loading, className, children })
  const content = (
    <>
      {loading && <span className="spin" aria-hidden="true" />}
      {children}
    </>
  )

  if (props.href !== undefined) {
    const { href, external, variant: _v, size: _s, block: _b, loading: _l, className: _c, children: _ch, ...rest } = props
    const isExternal = external ?? /^(https?:|mailto:|tel:)/.test(href)
    if (isExternal) {
      return (
        <a href={href} className={cls} {...rest}>
          {content}
        </a>
      )
    }
    return (
      <Link href={href} className={cls} {...rest}>
        {content}
      </Link>
    )
  }

  const { variant: _v, size: _s, block: _b, loading: _l, className: _c, children: _ch, href: _h, disabled, type, ...rest } = props
  const isDisabled = Boolean(disabled || loading)
  return (
    <button
      type={type ?? 'button'}
      className={cls}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      {...rest}
    >
      {content}
    </button>
  )
}
