import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export const TOAST_MS = 2400

type Ctx = { say: (msg: string) => void }
const ToastContext = createContext<Ctx | null>(null)

/** One `.toast[role=status]` at a time; a new message replaces the old one; it hides after 2400 ms. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('')
  const [n, setN] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const say = useCallback((m: string) => {
    if (timer.current) clearTimeout(timer.current)
    setMsg(m)
    setN((x) => x + 1)
    timer.current = setTimeout(() => setMsg(''), TOAST_MS)
  }, [])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const value = useMemo(() => ({ say }), [say])
  return (
    <ToastContext.Provider value={value}>
      {children}
      {msg ? <div key={n} className="toast" role="status">{msg}</div> : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
