// src/components/ui/Toast.tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastLevel = 'success' | 'error' | 'info'

interface ToastItem { id: number; message: string; level: ToastLevel }

interface ToastContextValue {
  success: (msg: string) => void
  error:   (msg: string) => void
  info:    (msg: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  success: () => {}, error: () => {}, info: () => {},
})

let _nextId = 0

const STYLES: Record<ToastLevel, { border: string; bg: string; color: string; icon: string }> = {
  success: { border: 'var(--success)',      bg: 'var(--success-muted)', color: 'var(--success)',  icon: '✓' },
  error:   { border: 'var(--danger)',       bg: 'var(--danger-muted)',  color: 'var(--danger)',   icon: '✗' },
  info:    { border: 'var(--accent)',       bg: 'var(--accent-muted)',  color: 'var(--accent)',   icon: 'ℹ' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const add = useCallback((message: string, level: ToastLevel) => {
    const id = ++_nextId
    setToasts(prev => [...prev, { id, message, level }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const value: ToastContextValue = {
    success: msg => add(msg, 'success'),
    error:   msg => add(msg, 'error'),
    info:    msg => add(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const s = STYLES[t.level]
          return (
            <div
              key={t.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px',
                borderRadius: 8,
                border: `1px solid ${s.border}`,
                background: s.bg,
                color: s.color,
                fontSize: 13,
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                maxWidth: 360,
                pointerEvents: 'auto',
                animation: 'modal-in 200ms var(--ease-standard) forwards',
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>{s.icon}</span>
              <span>{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
