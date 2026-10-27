// src/components/ui/LoadingScreen.tsx
export default function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', background: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div className="spinner" />
        <span style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Loading
        </span>
      </div>
    </div>
  )
}
