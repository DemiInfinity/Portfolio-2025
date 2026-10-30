import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

let locks = 0
const stack: symbol[] = []
let savedOverflow = ''

/**
 * Shared modal behaviour: focus moves in on open (to `initial` or the first control),
 * Tab is trapped, Esc calls onClose (unless blocked), body scroll is locked,
 * and focus returns to the opener on close.
 */
export function useModal(
  ref: RefObject<HTMLElement | null>,
  { onClose, blocked = false, initial }: { onClose: () => void; blocked?: boolean; initial?: RefObject<HTMLElement | null> },
) {
  const closeRef = useRef(onClose)
  const blockedRef = useRef(blocked)
  useEffect(() => {
    closeRef.current = onClose
    blockedRef.current = blocked
  })

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const node = ref.current
    const first = initial?.current || node?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()

    if (locks === 0) savedOverflow = document.body.style.overflow
    locks += 1
    document.body.style.overflow = 'hidden'

    const id = Symbol('modal')
    stack.push(id)
    const onKey = (e: KeyboardEvent) => {
      // only the top-most modal (e.g. a confirm over an editor) owns the keyboard
      if (stack[stack.length - 1] !== id) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        if (!blockedRef.current) closeRef.current()
        return
      }
      if (e.key === 'Tab' && node) {
        const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (!items.length) return
        const a = items[0]
        const z = items[items.length - 1]
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault()
          z.focus()
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault()
          a.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const at = stack.indexOf(id)
      if (at >= 0) stack.splice(at, 1)
      locks -= 1
      if (locks <= 0) {
        locks = 0
        document.body.style.overflow = savedOverflow
      }
      if (opener && document.contains(opener)) opener.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
