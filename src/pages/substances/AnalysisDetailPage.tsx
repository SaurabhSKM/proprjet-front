// src/pages/substances/AnalysisDetailPage.tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useAnalysis } from '@/api/analyses'
import AnalysisCard from './AnalysisCard'
import LoadingScreen from '@/components/ui/LoadingScreen'

export default function AnalysisDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const { data: analysis, isLoading } = useAnalysis(id)

  if (isLoading) return <LoadingScreen />
  if (!analysis) return (
    <div style={{ padding: 32, color: 'var(--text-muted)' }}>Analysis not found.</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: 'var(--text-muted)', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'inherit', padding: 0, transition: 'color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← Back to substance
        </button>
        <h1 className="page-title">Analysis</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
            {analysis.analysis_id}
          </span>
          <span className="badge badge-info">
            {analysis.data_source_type.replace('_', ' ')}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {analysis.created_at ? new Date(analysis.created_at).toLocaleDateString() : '—'}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', maxWidth: 800 }}>
        <AnalysisCard analysis={analysis} defaultOpen />
      </div>
    </div>
  )
}
