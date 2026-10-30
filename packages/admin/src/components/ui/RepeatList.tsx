import { useEffect, useRef, useState, type ReactNode } from 'react'
import ConfirmDialog from './ConfirmDialog'
import Icon from './Icon'

type Props<T extends { _k: string }> = {
  kind: string
  items: T[]
  onChange: (items: T[]) => void
  make: () => T
  max: number
  min?: number
  hasText: (item: T) => boolean
  addLabel?: string
  children: (item: T, index: number, update: (patch: Partial<T>) => void) => ReactNode
}

/**
 * The plan's repeatable list (RL): `.item` blocks with "{Kind} {n}", move up/down, Remove (confirmed when the item has text),
 * and "Add {kind}" (disabled with "Up to {max}." at the maximum). Focus follows Add and Remove.
 */
export default function RepeatList<T extends { _k: string }>({ kind, items, onChange, make, max, min = 0, hasText, addLabel, children }: Props<T>) {
  const lower = kind.toLowerCase()
  const box = useRef<HTMLDivElement>(null)
  const addBtn = useRef<HTMLButtonElement>(null)
  const [asking, setAsking] = useState<number | null>(null)
  const focusNext = useRef<{ k: string; what: 'first' | 'remove' } | 'add' | null>(null)

  useEffect(() => {
    const f = focusNext.current
    if (!f) return
    focusNext.current = null
    if (f === 'add') return addBtn.current?.focus()
    const el = box.current?.querySelector<HTMLElement>(`[data-item="${f.k}"]`)
    if (!el) return
    if (f.what === 'first') el.querySelector<HTMLElement>('input,textarea,select')?.focus()
    else el.querySelector<HTMLElement>('[data-remove]')?.focus()
  })

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = items.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const add = () => {
    const it = make()
    focusNext.current = { k: it._k, what: 'first' }
    onChange([...items, it])
  }
  const doRemove = (i: number) => {
    const prev = items[i - 1]
    focusNext.current = prev ? { k: prev._k, what: 'remove' } : 'add'
    onChange(items.filter((_, k) => k !== i))
  }
  const remove = (i: number) => (hasText(items[i]) ? setAsking(i) : doRemove(i))

  return (
    <div ref={box} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((it, i) => (
        <div key={it._k} className="item" data-item={it._k}>
          <div className="item-head">
            <p className="b">{kind} {i + 1}</p>
            <button type="button" className="iconbtn" aria-label={`Move ${lower} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" /></button>
            <button type="button" className="iconbtn" aria-label={`Move ${lower} ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}><Icon name="down" /></button>
            <button type="button" className="btn btn-text" data-remove aria-label={`Remove ${lower} ${i + 1}`} disabled={items.length <= min} onClick={() => remove(i)}>Remove</button>
          </div>
          {children(it, i, (patch) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x))))}
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button ref={addBtn} type="button" className="btn btn-line" onClick={add} disabled={items.length >= max} style={{ alignSelf: 'flex-start' }}>{addLabel || `Add ${lower}`}</button>
        {items.length >= max ? <span className="hint">Up to {max}.</span> : null}
      </div>
      {asking !== null ? (
        <ConfirmDialog
          title={`Remove ${lower} ${asking + 1}?`}
          description="Its text is lost when you save."
          confirmLabel="Remove"
          onCancel={() => setAsking(null)}
          onConfirm={() => {
            const i = asking
            setAsking(null)
            doRemove(i)
          }}
        />
      ) : null}
    </div>
  )
}
