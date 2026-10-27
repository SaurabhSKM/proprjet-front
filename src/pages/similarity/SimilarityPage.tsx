// src/pages/similarity/SimilarityPage.tsx
import { useState, useEffect } from 'react'
import { useSubstances } from '@/api/substances'
import { useAvailableSimilarityModels, useSimilarSubstances, useEmbedAllSubstances } from '@/api/similarity'
import { useToast } from '@/components/ui/Toast'
import type { Substance, SimilarSubstanceResult } from '@/types'

export default function SimilarityPage() {
  const { data: substances = [] } = useSubstances()
  const { data: availableModels = [] } = useAvailableSimilarityModels()

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  
  // 1. Array of selected models for side-by-side comparison
  const [selectedModels, setSelectedModels] = useState<string[]>(['m_similarity_trimodal_v1'])
  const [k, setK] = useState(10)
  
  // 2. Dedicated state for the "Re-embed All" button dropdown
  const [embedTarget, setEmbedTarget] = useState<string>('')
  const toast = useToast()

  // Fallback to ensure we always have valid defaults
  useEffect(() => {
    if (availableModels.length > 0) {
      if (!embedTarget) setEmbedTarget(availableModels[0].model_id)
      
      // If the currently selected models somehow got deleted, reset to the first available
      setSelectedModels(prev => {
        const valid = prev.filter(id => availableModels.some(m => m.model_id === id))
        return valid.length > 0 ? valid : [availableModels[0].model_id]
      })
    }
  }, [availableModels, embedTarget])

  const embedAllMut = useEmbedAllSubstances(embedTarget)

  const filtered = substances.filter((s: Substance) =>
    s.nom?.toLowerCase().includes(query.toLowerCase())
  )

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        // Prevent deselecting the last model
        if (prev.length === 1) return prev
        return prev.filter(id => id !== modelId)
      }
      return [...prev, modelId]
    })
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left: model + substance picker ───────────────────────────── */}
      <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Compare Models</span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 14 }}>
            {availableModels.map(m => (
              <label
                key={m.model_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 5,
                  fontSize: 12, cursor: 'pointer', transition: 'background 150ms',
                  background: selectedModels.includes(m.model_id) ? 'var(--accent-muted)' : 'transparent',
                  color: selectedModels.includes(m.model_id) ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <input
                  type="checkbox" 
                  checked={selectedModels.includes(m.model_id)}
                  onChange={() => toggleModel(m.model_id)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                {m.label}
              </label>
            ))}
          </div>

          <input
            placeholder="Search substances…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="field"
            style={{ marginTop: 16, fontSize: 13, padding: '7px 10px', width: '100%' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {filtered.map((s: Substance) => (
            <button
              key={s.substance_id}
              onClick={() => setSelected(s.substance_id)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 5, marginBottom: 2,
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', border: 'none', transition: 'all 150ms',
                background: selected === s.substance_id ? 'var(--accent-muted)' : 'transparent',
                color: selected === s.substance_id ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {s.nom}
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '24px 12px', textAlign: 'center' }}>
              No substances match.
            </p>
          )}
        </div>

        {/* ── Re-embed actions (Moved to bottom) ── */}
        <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Batch Re-Embed
          </span>
          <select 
            value={embedTarget} 
            onChange={e => setEmbedTarget(e.target.value)}
            className="field" 
            style={{ fontSize: 12, padding: '6px 8px' }}
          >
            {availableModels.map(m => (
              <option key={m.model_id} value={m.model_id}>{m.model_name || m.model_id}</option>
            ))}
          </select>
          <button
            onClick={() => embedAllMut.mutate(undefined, {
              onSuccess: (res) => toast.success(`Embedded ${res.data.data?.embedded} substances for ${embedTarget}`),
              onError: () => toast.error('Batch embedding failed'),
            })}
            disabled={embedAllMut.isPending || !embedTarget}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%' }}
          >
            {embedAllMut.isPending ? 'Embedding…' : 'Run Batch Job'}
          </button>
        </div>
      </div>

      {/* ── Right: comparison results ─────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px', background: 'var(--bg-body)' }}>
        {!selected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Select a substance to compare similarities</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, fontWeight: 400, margin: 0 }}>
                Nearest Neighbors Comparison
              </h2>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                k=
                <input
                  type="number" min={1} max={50} value={k}
                  onChange={e => setK(Number(e.target.value))}
                  className="field" style={{ width: 60, fontSize: 12, padding: '4px 6px' }}
                />
              </label>
            </div>

            {/* Grid dynamically adjusts based on how many models are checked */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: `repeat(${selectedModels.length}, minmax(300px, 1fr))`, 
              gap: 24,
              alignItems: 'start'
            }}>
              {selectedModels.map(modelId => {
                const modelSpec = availableModels.find(m => m.model_id === modelId)
                return (
                  <ModelResultsColumn 
                    key={modelId} 
                    modelId={modelId} 
                    modelLabel={modelSpec?.label || modelId}
                    substanceId={selected} 
                    k={k} 
                  />
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── New Sub-Component: Handles individual model fetching safely ─────────────
function ModelResultsColumn({ modelId, modelLabel, substanceId, k }: { modelId: string, modelLabel: string, substanceId: string, k: number }) {
  const { data: results = [], isLoading, isError } = useSimilarSubstances(substanceId, modelId, k)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ 
        padding: '12px 16px', 
        background: 'var(--bg-surface)', 
        border: '1px solid var(--border)', 
        borderRadius: 6,
        borderTop: '3px solid var(--accent)'
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          {modelLabel}
        </h3>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          {modelId}
        </span>
      </div>

      {isLoading && <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '0 8px' }}>Computing neighbors…</p>}
      
      {isError && !isLoading && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-muted)', borderRadius: 6, border: '1px solid var(--danger)' }}>
          <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>
            No embedding found. Try running the batch job for this model.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {results.map((r: SimilarSubstanceResult, i: number) => (
          <div
            key={r.substance_id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6,
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 18 }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.name}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-secondary)' }}>
                {(r.similarity_score * 100).toFixed(1)}%
              </span>
              <div style={{ width: 60, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.max(0, r.similarity_score * 100)}%`, height: '100%',
                  background: r.similarity_score > 0.7 ? 'var(--success)' : r.similarity_score > 0.4 ? 'var(--warning)' : 'var(--danger)',
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}