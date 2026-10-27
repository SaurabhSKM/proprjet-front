// src/pages/substances/SubstanceDetail.tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSubstance, useSubstanceProperties, useSubstanceTimeline, useSubstanceLeaves } from '@/api/substances'
import { useAnalysesForSubstance, useCreateAnalysis } from '@/api/analyses'
import { useProperties } from '@/api/properties'
import { useSubstanceGCxGCAnalyses, useGCxGCTable, downloadGCxGCFile } from '@/api/gcxgc'
import type { GCxGCTableRow } from '@/api/gcxgc'
import { FamilyCarbonProfileChart } from '@/components/charts/FamilyCarbonProfileChart'
import AnalysisCard from './AnalysisCard'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { SkeletonRows, EmptyState } from '@/components/ui/primitives'
import { useQueryClient } from '@tanstack/react-query'
import PropertyValueModal from '@/components/PropertyValueModal' // <-- Adjust import path
import { useToast } from '@/components/ui/Toast'
// Adjust these import paths to match where your project defines them:
import  client  from '@/api/client'          // or '@/lib/client', '@/api/axios', etc.
import { substanceKeys } from '@/api/substances' // wherever your query keys are exported

const TABS = ['Overview', 'Analyses', 'Properties', 'GC×GC', 'Timeline'] as const
type Tab = typeof TABS[number]

function toChartRows(tableRows: GCxGCTableRow[]): Record<string, number | string>[] {
  return tableRows.map(row => ({
    carbon: `C${row.carbon}`,
    n_paraffines:          (row.n_paraffines            ?? 0),
    i_paraffines:          (row.i_paraffines             ?? 0),
    mononaphthene:         (row.mononaphthene            ?? 0),
    dinaphthenes:          (row.dinaphthenes             ?? 0),
    trinaphtenes:          (row.trinaphtenes             ?? 0),
    aromatiques:           (row.aromatiques              ?? 0),
    naphteneo_aromatiques: (row.naphteneo_aromatiques     ?? 0) + (row.naphteneo_aromatiques_h10 ?? 0),
    diaromatiques:         (row.diaromatiques             ?? 0),
    naphteno_diaro:        (row.naphteno_diaro           ?? 0) + (row.naphteno_diaro_h16         ?? 0),
    triaromatiques:        (row.triaromatiques            ?? 0) + (row.triaromatiques_h18 ?? 0),
    polyaroma:             (row.polyaroma                ?? 0)  + (row.polyaroma_h24 ?? 0)
                          + (row.polyaroma_h26 ?? 0) + (row.polyaroma_h28 ?? 0)
                          + (row.polyaroma_h30 ?? 0),
  }))
}

export default function SubstanceDetail() {
  const { name = '' } = useParams<{ name: string }>()
  const navigate      = useNavigate()
  const [tab, setTab] = useState<Tab>('Overview')

  const queryClient = useQueryClient()
  const toast = useToast()

  const [selectedGcxgcAnalysisId, setSelectedGcxgcAnalysisId] = useState<string | null>(null)

  const { data: substance, isLoading } = useSubstance(name)
  const { data: analyses   = [] }      = useAnalysesForSubstance(name)
  const { data: leaves     = [] }      = useSubstanceLeaves(name)
  const { data: properties = [] }      = useSubstanceProperties(name)
  const totalPropertiesCount = properties.reduce(
    (total, analysis) => total + analysis.properties.length, 0 )
  const { data: timeline   = [] }      = useSubstanceTimeline(name)
  const { data: propDefs   = [] }      = useProperties()
  const { data: propertiesByAnalysis = [], isLoading: propsLoading } = useSubstanceProperties(name)
  const propNameMap = Object.fromEntries(propDefs.map(p => [p.property_id, p.property_name]))
  const createAnalysis = useCreateAnalysis()

  // 1. STATE: Track which property row is open in the modal
  const [selectedProp, setSelectedProp] = useState<{
    analysisId: string
    valueId: string
    propertyId: string
    propertyName: string
    value: number
    unit: string | null
    methodId?: string | null
  } | null>(null)

  const substanceId = substance?.substance_id ?? null
  const { data: gcxgcAnalyses = [] } = useSubstanceGCxGCAnalyses(substanceId)
  const gcxgcAnalysisId = selectedGcxgcAnalysisId ?? gcxgcAnalyses[0]?.analysis_id ?? null
  const { data: gcxgcTableRows = [] } = useGCxGCTable(gcxgcAnalysisId)

  if (isLoading) return <LoadingScreen />
  if (!substance) return (
    <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>Substance not found.</div>
  )

  const handleAddAnalysis = () => {
    navigate(`/substances/${name}/analyses/new`)
  }

// 2. HANDLER: Save value updates back to the backend
  const handleSaveValue = async (updates: {
    value?: number
    reported_unit?: string
    method_id?: string
    change_reason?: string
    reference_ids?: string[] // <-- Catch the staged references here
  }) => {
    if (!selectedProp) return
    try {
      const payload = {
        value: updates.value,
        reported_unit: updates.reported_unit || undefined,
        method_id: updates.method_id || undefined,
        change_reason: updates.change_reason || undefined,
        reference_ids: updates.reference_ids || [] // <-- Send them to the backend
      }

      await client.patch(`/constants/${selectedProp.valueId}`, payload)
      
      toast.success('Property value updated successfully')
      setSelectedProp(null)
      queryClient.invalidateQueries({ queryKey: substanceKeys.properties(name) })
    } catch (err) {
      // Cast the unknown error to the expected API error shape
      const error = err as { response?: { data?: { message?: string } } }
      
      toast.error(error?.response?.data?.message ?? 'Failed to update property value')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="page-header">
        <button
          onClick={() => navigate('/substances')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: 'var(--text-muted)', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'inherit', padding: 0,
            transition: 'color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← Substances
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: 32, fontWeight: 400,
              color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1,
            }}>
              {substance.nom}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                {substance.substance_id}
              </span>
              <span className="badge badge-info">
                {substance.substance_type.replace('_', ' ')}
              </span>
              {substance.is_breakable && (
                <span className="badge badge-neutral">breakable</span>
              )}
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAddAnalysis}
            disabled={createAnalysis.isPending}
          >
            + Add Analysis
          </button>
        </div>

        {/* Tabs */}
        <div className="tab-bar" style={{ marginTop: 18 }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`tab-item ${tab === t ? 'active' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }} className="tab-content-enter">

        {/* Overview */}
        {tab === 'Overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* Stat strip — 4 across */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <StatCard label="Analyses"    value={analyses.length} accent />
              <StatCard label="Properties"  value={totalPropertiesCount} accent />
              <StatCard label="Compositions" value={leaves.length} />
              <StatCard label="Type"         value={substance.substance_type.replace('_', ' ')} />
            </div>

            {leaves.length > 0 && (
              <div>
                <div className="section-label">Composition ({leaves.length} components)</div>
                {/* Stacked bar */}
                <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', marginBottom: 16 }}>
                  {leaves.sort((a, b) => b.fraction - a.fraction).map((leaf, i) => {
                    const hue = (i * 67 + 200) % 360
                    return (
                      <div
                        key={leaf.substance_id}
                        title={`${leaf.nom}: ${(leaf.fraction * 100).toFixed(1)}%`}
                        style={{ width: `${(leaf.fraction * 100).toFixed(1)}%`, background: `hsl(${hue}, 58%, 52%)` }}
                      />
                    )
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {leaves.sort((a, b) => b.fraction - a.fraction).map((leaf, i) => {
                    const hue = (i * 67 + 200) % 360
                    return (
                      <div key={leaf.substance_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: `hsl(${hue}, 58%, 52%)` }} />
                        <button
                          onClick={() => navigate(`/substances/${leaf.nom}`)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            fontSize: 13, color: 'var(--accent)', fontFamily: 'inherit',
                            flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            textDecoration: 'underline', textUnderlineOffset: 3,
                          }}
                        >
                          {leaf.nom}
                        </button>
                        <div style={{ flexShrink: 0, width: 120, background: 'var(--border)', borderRadius: 2, height: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: `hsl(${hue}, 58%, 52%)`, width: `${(leaf.fraction * 100).toFixed(1)}%` }} />
                        </div>
                        <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)', width: 52, textAlign: 'right', flexShrink: 0 }}>
                          {(leaf.fraction * 100).toFixed(1)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analyses */}
        {tab === 'Analyses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {analyses.length === 0 && (
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No analyses yet. Add one above.</p>
            )}
            {analyses.map(a => (
              <div key={a.analysis_id} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                  <button
                    onClick={() => navigate(`/analyses/${a.analysis_id}`)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit',
                      transition: 'color 150ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    open ↗
                  </button>
                </div>
                <AnalysisCard analysis={a} />
              </div>
            ))}
          </div>
        )}

        {/* Properties */}
        {tab === 'Properties' && (
          <div>
            {propsLoading && <SkeletonRows rows={6} height={46} />}
            
            {!propsLoading && propertiesByAnalysis.length === 0 && (
              <EmptyState
                icon="◌"
                title="No properties recorded"
                description="Add an analysis and enter constant values to see properties here."
              />
            )}
            
            {!propsLoading && propertiesByAnalysis.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {propertiesByAnalysis.map(analysis => (
                  <div key={analysis.analysis_id}>
                    
                    {/* Analysis Header */}
                    <div style={{ marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Analysis: {analysis.analysis_id.slice(0, 8)}…
                      </span>
                      {analysis.data_source && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Source: {analysis.data_source}
                        </span>
                      )}
                    </div>

                    {/* Properties Grid - CLICKABLE CARDS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, alignItems: 'start' }}>
                      {analysis.properties.map(p => {
                        const displayName = propNameMap[p.property_id] ?? p.property_name

                        return (
                          <div
                            key={p.value_id} /* Using value_id avoids React duplicate key warnings for multi-method properties */
                            className="data-row"
                            onClick={() => setSelectedProp({
                              analysisId: analysis.analysis_id,
                              valueId: p.value_id,
                              propertyId: p.property_id,
                              propertyName: displayName,
                              value: p.value,
                              unit: p.unit,
                              methodId: p.method_id,
                            })}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 14px',
                              background: 'var(--bg-secondary)',
                              borderRadius: 6,
                              cursor: 'pointer',
                              transition: 'background 0.15s ease, border-color 0.15s ease',
                              border: '1px solid transparent',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = 'var(--border-focus, #888)'
                              e.currentTarget.style.background = 'var(--bg-elevated)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = 'transparent'
                              e.currentTarget.style.background = 'var(--bg-secondary)'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)' }}>
                                {displayName}
                              </span>
                              {/* Shows the method badge (e.g. ASTM D613) if recorded */}
                              {p.method_name && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {p.method_name}
                                </span>
                              )}
                            </div>
                            
                            <span className="num" style={{ fontSize: 14, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                              {p.value_qualifier && (
                                <span style={{ color: 'var(--accent)', fontSize: 11, fontStyle: 'italic' }}>
                                  {p.value_qualifier}
                                </span>
                              )}
                              {p.value.toFixed(4)}
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {p.unit ?? '—'}
                              </span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedProp && (
          <PropertyValueModal
            kind="constant"
            valueId={selectedProp.valueId}
            propertyId={selectedProp.propertyId}
            propertyName={selectedProp.propertyName}
            currentValue={selectedProp.value}
            currentUnit={selectedProp.unit}
            currentMethodId={selectedProp.methodId}
            onClose={() => setSelectedProp(null)}
            onSaveValue={handleSaveValue}
          />
        )}

        {/* GC×GC */}
        {tab === 'GC×GC' && (() => {
          const gcxgcOverallTotal = gcxgcTableRows.reduce((s, r) => s + (r.total ?? 0), 0)
          const totalOk  = gcxgcOverallTotal >= 99 && gcxgcOverallTotal <= 101
          const totalBad = gcxgcOverallTotal < 90  || gcxgcOverallTotal > 110
          const totalColor = gcxgcTableRows.length === 0
            ? 'var(--text-muted)'
            : totalOk  ? 'var(--success, #3db87a)'
            : totalBad ? 'var(--danger)'
            :             'var(--warning, #f5a742)'

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {gcxgcAnalyses.length === 0 ? (
                <EmptyState
                  icon="⊕"
                  title="No GC×GC data"
                  description="Use the GC×GC section to upload or enter composition data for this substance."
                />
              ) : (
                <>
                  {/* Analysis selector + download buttons + total badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 500, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: 'var(--text-muted)',
                    }}>
                      Analysis
                    </span>
                    <select
                      value={gcxgcAnalysisId ?? ''}
                      onChange={e => setSelectedGcxgcAnalysisId(e.target.value || null)}
                      style={{
                        padding: '5px 10px',
                        fontSize: 12,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        color: 'var(--text-primary)',
                        outline: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      {gcxgcAnalyses.map(a => (
                        <option key={a.analysis_id} value={a.analysis_id}>
                          {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'} · {a.data_source_type} · {a.created_by}
                        </option>
                      ))}
                    </select>
                    {gcxgcAnalysisId && (
                      <>
                        <button className="btn btn-sm" onClick={() => downloadGCxGCFile(gcxgcAnalysisId, 'csv')}>↓ CSV</button>
                        <button className="btn btn-sm" onClick={() => downloadGCxGCFile(gcxgcAnalysisId, 'xlsx')}>↓ Excel</button>
                      </>
                    )}
                    {/* GCxGC composition total badge */}
                    {gcxgcTableRows.length > 0 && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '5px 12px', borderRadius: 6,
                        border: `1px solid color-mix(in srgb, ${totalColor} 35%, transparent)`,
                        background: `color-mix(in srgb, ${totalColor} 8%, transparent)`,
                        marginLeft: 'auto',
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                          GCxGC Total
                        </span>
                        <span style={{
                          fontSize: 13, fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                          fontWeight: 700, color: totalColor,
                        }}>
                          {gcxgcOverallTotal.toFixed(3)} %m
                        </span>
                        {!totalOk && (
                          <span style={{ fontSize: 11, color: totalColor }}>
                            {totalOk ? '' : gcxgcOverallTotal < 99 ? '⚠ incomplete' : '⚠ exceeds 100%'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Chart */}
                  {gcxgcTableRows.length > 0 && (
                    <FamilyCarbonProfileChart
                      rows={toChartRows(gcxgcTableRows)}
                      height={280}
                    />
                  )}

                  {/* Compact data table (non-zero rows only) */}
                  {gcxgcTableRows.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 12,
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                      }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border)', fontSize: 11, letterSpacing: '0.08em' }}>C#</th>
                            <th style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border)', fontSize: 11, letterSpacing: '0.08em' }}>n-Para</th>
                            <th style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border)', fontSize: 11, letterSpacing: '0.08em' }}>i-Para</th>
                            <th style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border)', fontSize: 11, letterSpacing: '0.08em' }}>Cyclopara</th>
                            <th style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border)', fontSize: 11, letterSpacing: '0.08em' }}>Aromatics</th>
                            <th style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--accent)', fontWeight: 600, borderBottom: '1px solid var(--border)', fontSize: 11, letterSpacing: '0.08em' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gcxgcTableRows.filter(r => r.total > 0).map(row => (
                            <tr
                              key={row.carbon}
                              style={{ borderBottom: '1px solid var(--border)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <td style={{ padding: '5px 10px', color: 'var(--text-muted)' }}>C{row.carbon}</td>
                              <td style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--text-primary)' }}>
                              {row.n_paraffines ?? 0}
                              </td>
                              <td style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--text-primary)' }}>
                                {row.i_paraffines ?? 0}
                              </td>
                              <td style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--text-primary)' }}>
                                {(row.mononaphthene ?? 0) + (row.dinaphthenes ?? 0) + (row.trinaphtenes ?? 0)}
                              </td>
                              <td style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--text-primary)' }}>
                                {(row.aromatiques ?? 0) + (row.naphteneo_aromatiques ?? 0) + (row.naphteneo_aromatiques_h10 ?? 0)
                                  + (row.diaromatiques ?? 0) + (row.naphteno_diaro ?? 0) + (row.naphteno_diaro_h16 ?? 0)
                                  + (row.triaromatiques_h18 ?? 0) + (row.triaromatiques ?? 0)
                                  + (row.polyaroma ?? 0) + (row.polyaroma_h24 ?? 0) + (row.polyaroma_h26 ?? 0)
                                  + (row.polyaroma_h28 ?? 0) + (row.polyaroma_h30 ?? 0)}
                              </td>
                              <td style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>
                                {row.total}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-surface)' }}>
                            <td style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                              Σ Total
                            </td>
                            <td colSpan={4} />
                            <td style={{
                              padding: '6px 10px', textAlign: 'right', fontWeight: 700,
                              color: totalColor,
                            }}>
                              {gcxgcOverallTotal.toFixed(3)} %m{!totalOk && ' ⚠'}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })()}

        {/* Timeline */}
        {tab === 'Timeline' && (
          <div style={{ position: 'relative', maxWidth: 760 }}>
            <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 1, background: 'var(--border)' }} />
            {timeline.length === 0 && (
              <p style={{ fontSize: 14, color: 'var(--text-muted)', paddingLeft: 44 }}>No events recorded.</p>
            )}
            {timeline.map((evt, i) => (
              <div key={i} style={{ position: 'relative', paddingLeft: 44, paddingBottom: 28 }}>
                <div style={{
                  position: 'absolute', left: 9, top: 5,
                  width: 13, height: 13, borderRadius: '50%',
                  background: 'var(--bg-elevated)', border: '2px solid var(--accent)',
                }} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {evt.created_at ? new Date(evt.created_at).toLocaleDateString() : '—'} · {evt.data_source_type}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {evt.source_metadata
                    ? Object.entries(evt.source_metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')
                    : evt.created_by ?? ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, ui-monospace, monospace', marginTop: 4 }}>
                  {evt.analysis_id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div style={{
      padding: '20px 24px',
      background: 'var(--bg-surface)',
      border: `1px solid ${accent ? 'var(--border-mid)' : 'var(--border)'}`,
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{
        fontSize: 30, fontWeight: 700, color: accent ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: typeof value === 'number' ? 'JetBrains Mono, ui-monospace, monospace' : 'inherit',
        lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  )
}
