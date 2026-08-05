/**
 * Lightweight toast notifications.
 *
 * `useToast()` returns `{ success, error, info }`. Toasts auto-dismiss and
 * stack bottom-center above everything (including the full-screen module
 * overlays). This is the app's single user-facing feedback channel for
 * async success/failure — replaces silently-swallowed errors.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { C, EASE_OUT } from '../lib/designTokens'

type ToastKind = 'success' | 'error' | 'info'
interface Toast { id: number; kind: ToastKind; message: string }

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

const KIND: Record<ToastKind, { bg: string; fg: string; border: string; icon: string }> = {
  success: { bg: 'var(--tint-fresh)', fg: '#1F7A54', border: 'rgba(31,122,84,0.25)', icon: '✓' },
  error: { bg: 'var(--tint-danger)', fg: 'var(--c-danger)', border: 'rgba(var(--c-danger-rgb), 0.25)', icon: '!' },
  info: { bg: C.surface, fg: C.text, border: C.border, icon: 'i' },
}

const DURATION_MS = 4200

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => remove(id), DURATION_MS)
  }, [remove])

  const api = useMemo<ToastApi>(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 24, zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          pointerEvents: 'none', padding: '0 16px',
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const k = KIND[t.kind]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.28, ease: EASE_OUT }}
                onClick={() => remove(t.id)}
                role="status"
                style={{
                  pointerEvents: 'auto', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  maxWidth: 440, padding: '11px 16px',
                  background: k.bg, color: k.fg,
                  border: `1px solid ${k.border}`, borderRadius: 10,
                  boxShadow: C.shadow3,
                  fontFamily: "'Outfit',sans-serif", fontSize: 13.5, fontWeight: 500,
                }}
              >
                <span style={{
                  flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                  background: k.fg, color: k.bg,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}>{k.icon}</span>
                <span>{t.message}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
