// src/pages/optimizer/OptimizerPage.tsx
import PoolSidebar from './PoolSidebar'
import Tab1Predefined from './Tab1Predefined'
import Tab2Manual from './Tab2Manual'
import Tab3Studio from './Tab3Studio'
import Tab4Distillation from './Tab4Distillation'
import Tab5Reference from './Tab5Reference'
import Tab6History from './Tab6History'
import { useOptimizerStore } from '@/store/optimizerStore'

const TABS = [
  { id: 0, label: 'Predefined',    abbr: 'PRE' },
  { id: 1, label: 'Manual',        abbr: 'MAN' },
  { id: 2, label: 'Studio',        abbr: 'STU' },
  { id: 3, label: 'Distillation',  abbr: 'DIST' },
  { id: 4, label: 'Reference',     abbr: 'REF' },
  { id: 5, label: 'History',       abbr: 'HIST' },
]

export default function OptimizerPage() {
  const { activeTab, setActiveTab, selectedIds } = useOptimizerStore()

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <PoolSidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Tab bar */}
        <div style={{
          flexShrink: 0,
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          padding: '0 16px',
          gap: 2,
        }}>
          {TABS.map(t => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '0 16px',
                  height: 44,
                  fontSize: 13,
                  letterSpacing: '0.06em',
                  fontWeight: active ? 600 : 400,
                  border: 'none',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  borderTop: '2px solid transparent',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  transition: 'all 150ms',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                {t.label}
              </button>
            )
          })}

          {/* pool badge */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {selectedIds.length > 0 && (
              <span style={{
                fontSize: 12,
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                color: 'var(--accent)',
                background: 'var(--accent-muted)',
                padding: '2px 10px',
                borderRadius: 10,
                letterSpacing: '0.05em',
              }}>
                {selectedIds.length} in pool
              </span>
            )}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 0 && <Tab1Predefined />}
          {activeTab === 1 && <Tab2Manual />}
          {activeTab === 2 && <Tab3Studio />}
          {activeTab === 3 && <Tab4Distillation />}
          {activeTab === 4 && <Tab5Reference />}
          {activeTab === 5 && <Tab6History />}
        </div>
      </div>
    </div>
  )
}
