// src/components/ui/CollapsiblePanel.tsx
// Collapsible side-panel with an 18px grip handle.
// Width transitions smoothly; inner content stays at fixed width to prevent reflow.
import type { ReactNode } from 'react'

interface CollapsiblePanelProps {
  open: boolean
  onToggle: () => void
  width?: number
  children: ReactNode
}

export function CollapsiblePanel({ open, onToggle, width = 360, children }: CollapsiblePanelProps) {
  return (
    <div style={{ display: 'flex', flexShrink: 0, height: '100%' }}>
      {/* Sliding panel */}
      <div style={{
        width: open ? width : 0,
        overflow: 'hidden',
        transition: 'width 260ms cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
      }}>
        <div style={{
          width,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRight: '1px solid var(--border)',
        }}>
          {children}
        </div>
      </div>

      {/* Grip handle */}
      <div
        onClick={onToggle}
        title={open ? 'Collapse panel' : 'Expand panel'}
        style={{
          width: 18,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          userSelect: 'none',
          transition: 'background 150ms',
          gap: 4,
          position: 'relative',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-muted)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)' }}
      >
        {/* grip dots */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-hi)', flexShrink: 0 }} />
        ))}
        {/* chevron */}
        <span style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          position: 'absolute',
          bottom: 10,
          display: 'inline-block',
          transform: open ? 'none' : 'rotate(180deg)',
          transition: 'transform 260ms cubic-bezier(0.4, 0, 0.2, 1)',
          lineHeight: 1,
        }}>‹</span>
      </div>
    </div>
  )
}
