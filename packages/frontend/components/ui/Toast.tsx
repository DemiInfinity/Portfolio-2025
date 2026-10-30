'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Spark from './Spark'

export const TOAST_DURATION_MS = 2600

type ToastVariant = 'info' | 'error'
type ToastState = { id: number; message: string; variant: ToastVariant } | null

type ToastApi = { show: (message: string, variant?: ToastVariant) => void }

const ToastContext = createContext<ToastApi | null>(null)

/** Fixed bottom-centre pill, role="status", hides after 2600ms (Interactions "Toasts"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((message: string, variant: ToastVariant = 'info') => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ id: Date.now(), message, variant })
    timer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS)
  }, [])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div key={toast.id} role="status" className={toast.variant === 'error' ? 'toast toast-error' : 'toast'}>
          {toast.variant === 'info' && <Spark size={18} style={{ color: 'var(--c1)', flex: 'none' }} />}
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
