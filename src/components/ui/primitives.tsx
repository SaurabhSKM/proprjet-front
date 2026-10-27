// src/components/ui/primitives.tsx
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// FormField — label + input wrapper (always label above input per DESIGN.md)
// ─────────────────────────────────────────────────────────────────────────────
interface FormFieldProps { label: string; hint?: string; children: ReactNode }

export function FormField({ label, hint, children }: FormFieldProps) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: 6,
      }}>
        {label}
        {hint && (
          <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Input / Select — apply .field class
// ─────────────────────────────────────────────────────────────────────────────
export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`field ${className}`} {...props} />
}

export function Select({
  className = '', children, ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return <select className={`field ${className}`} {...props}>{children}</select>
}

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonRows — shimmer placeholder, matches final content height
// ─────────────────────────────────────────────────────────────────────────────
export function SkeletonRows({ rows = 5, height = 40 }: { rows?: number; height?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height, borderRadius: 6, opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState — zero-result placeholder with icon + title + description
// ─────────────────────────────────────────────────────────────────────────────
export function EmptyState({
  icon = '◌', title, description, action,
}: {
  icon?: string; title: string; description?: string; action?: ReactNode
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 32px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.2, userSelect: 'none' }}>{icon}</div>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: 0, marginBottom: 4 }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, maxWidth: 280 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SumIndicator — family target sum with colour coding
// ─────────────────────────────────────────────────────────────────────────────
export function SumIndicator({ sum }: { sum: number }) {
  const diff  = Math.abs(sum - 100)
  const cls   = diff < 0.5 ? 'sum-ok' : diff < 10 ? 'sum-warn' : 'sum-bad'
  const label = diff < 0.5 ? '✓ 100%' : `Σ = ${sum.toFixed(0)}%`
  return (
    <span className={cls} style={{ fontSize: 10, fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip — title-based tooltip wrapper
// ─────────────────────────────────────────────────────────────────────────────
export function Tooltip({ tip, children }: { tip: string; children: ReactNode }) {
  return <span title={tip} style={{ cursor: 'help' }}>{children}</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionLabel — uppercase tracking label for panel sections
// ─────────────────────────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 500, letterSpacing: '0.15em',
      textTransform: 'uppercase', color: 'var(--text-muted)',
      marginBottom: 8,
    }}>
      {children}
    </div>
  )
}
