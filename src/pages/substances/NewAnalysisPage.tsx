// src/pages/substances/NewAnalysisPage.tsx
import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useSubstance } from '@/api/substances'
import { usePropertyGroups, usePropertyCatalog } from '@/api/properties'
import { useCreateAnalysis, useDeleteAnalysis, analysisKeys } from '@/api/analyses'
import type { DataSeries, AddConstantPayload, AddSeriesPayload, AddPointsPayload, ApiResponse } from '@/types'
import client from '@/api/client'
import { useToast } from '@/components/ui/Toast'
import LoadingScreen from '@/components/ui/LoadingScreen'

type FieldMode = 'all' | 'select'

export default function NewAnalysisPage() {
  const { name = '' } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()

  const { data: substance, isLoading: subLoading } = useSubstance(name)
  const { data: groups = [] } = usePropertyGroups()
  const { data: catalog = [] } = usePropertyCatalog()

  // ── Property filtering ──────────────────────────────────────────────────
  const [fieldMode, setFieldMode] = useState<FieldMode>('select')
  const [selectedPropIds, setSelectedPropIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const classified = useMemo(() => {
    return catalog
      .filter(p => p.group_id !== 'g_gcxgc') // GCxGC is entered on its own page, not here
      .map(p => ({
        ...p,
        kind: p.group_id === 'g_distillation' ? ('distillation' as const)
          : p.series_count > 0 ? ('series' as const)
          : p.constant_count > 0 ? ('scalar' as const)
          : null,
      }))
      .filter(p => p.kind !== null)
  }, [catalog])

  const groupedProps = useMemo(() => {
    const byGroup = new Map<string, typeof classified>()
    for (const p of classified) {
      const gid = p.group_id ?? 'ungrouped'
      if (!byGroup.has(gid)) byGroup.set(gid, [])
      byGroup.get(gid)!.push(p)
    }
    return byGroup
  }, [classified])

  const visibleProps = useMemo(() => {
    return classified.filter(p => {
      if (search && !p.property_name.toLowerCase().includes(search.toLowerCase()) && !p.property_id.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      if (fieldMode === 'all') return true
      return selectedPropIds.has(p.property_id)
    })
  }, [classified, search, fieldMode, selectedPropIds])

  // ── Form state ───────────────────────────────────────────────────────────
  const [scalarValues, setScalarValues] = useState<Record<string, string>>({})
  const [scalarUnits] = useState<Record<string, string>>({})
  const [seriesPoints, setSeriesPoints] = useState<Record<string, { x: string; y: string }[]>>({})

  const createAnalysis = useCreateAnalysis()
  const [submitting, setSubmitting] = useState(false)
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null)
  const deleteAnalysis = useDeleteAnalysis()

  const handleSubmit = async () => {
    if (!substance) return
    setSubmitting(true)

    const filledScalars = Object.entries(scalarValues).filter(([, v]) => v !== '' && v != null)
    const filledSeries = Object.entries(seriesPoints)
        .map(([pid, pts]) => [pid, pts.filter(p => p.x !== '' && p.y !== '')] as const)
        .filter(([, pts]) => pts.length > 0)

    if (filledScalars.length === 0 && filledSeries.length === 0) {
        toast.error('Enter at least one value before submitting')
        setSubmitting(false)
        return
    }

    let analysisId: string | null = null

    try {
        const createRes = await createAnalysis.mutateAsync({
        substance_id: substance.substance_id,
        data_source_type: 'Manual_Entry',
        })
        analysisId = createRes.data.analysis_id
        if (!analysisId) throw new Error('Analysis creation did not return an analysis_id')

        for (const [propertyId, rawValue] of filledScalars) {
            const propDef = classified.find(p => p.property_id === propertyId)
            const unit = scalarUnits[propertyId] || propDef?.standard_unit || ''
            const payload: AddConstantPayload = {
                property_id: propertyId,
                value: Number(rawValue),
                reported_unit: unit,
            }
            await client.post(`/analyses/${analysisId}/constants`, payload)
        }

        for (const [propertyId, points] of filledSeries) {
        const isDistillation = classified.find(p => p.property_id === propertyId)?.kind === 'distillation'
        const xKey = isDistillation ? 'percent_distilled' : 'x'

        const seriesPayload: AddSeriesPayload = { property_id: propertyId }
        const seriesRes = await client.post<ApiResponse<DataSeries>>(`/analyses/${analysisId}/series`, seriesPayload)
        const seriesId = seriesRes.data.data?.series_id
        if (!seriesId) continue

        const pointsPayload: AddPointsPayload = {
            points: points.map(p => ({
            independent_variables: { [xKey]: Number(p.x) },
            dependent_value: Number(p.y),
            })),
        }
        await client.post(`/series/${seriesId}/points`, pointsPayload)
        }

        qc.invalidateQueries({ queryKey: analysisKeys.substance(name) })
        setSavedAnalysisId(analysisId)
        toast.success('Analysis saved')

    } catch (err) {
        // Roll back the orphaned analysis rather than leaving a partial/empty
        // record behind — a failed submit should leave the DB exactly as it
        // was before the click, not a half-written analysis only visible by
        // querying the DB directly.
        if (analysisId) {
        try {
            await deleteAnalysis.mutateAsync(analysisId)
        } catch (rollbackErr) {
            console.error('Rollback failed — analysis may be orphaned:', analysisId, rollbackErr)
            toast.error(`Save failed AND rollback failed — analysis ${analysisId} may need manual cleanup`)
            setSubmitting(false)
            return
        }
        }
        const message = err instanceof Error ? err.message : 'Failed to save analysis'
        toast.error(message)
        console.error(err)
    } finally {
        setSubmitting(false)
    }
    }

  if (subLoading) return <LoadingScreen />
  if (!substance) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Substance not found.</div>

  const hasAnyData =
    Object.values(scalarValues).some(v => v !== '') ||
    Object.values(seriesPoints).some(pts => pts.some(p => p.x !== '' && p.y !== ''))

  // Once saved, this page becomes a short confirmation + handoff screen
  // rather than staying as an editable form — the analysis already exists,
  // re-submitting would create a duplicate rather than edit it.
  if (savedAnalysisId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
        <div style={{ fontSize: 40 }}>✓</div>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
          Analysis <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--accent)' }}>{savedAnalysisId}</span> saved for {substance.nom}.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate(`/gcxgc?substance_id=${substance.substance_id}&analysis_id=${savedAnalysisId}`)}
            className="btn btn-secondary"
          >
            + Add GCxGC data for this analysis →
          </button>
          <button
            onClick={() => navigate(`/substances/${name}`)}
            className="btn btn-primary"
          >
            Back to {substance.nom}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 420, textAlign: 'center' }}>
          Note: GCxGC entry currently always creates its own separate analysis record —
          the query params above are passed through for when that's wired up to reuse
          this analysis_id instead. For now it'll still create a second one.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <button
          onClick={() => navigate(`/substances/${name}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontFamily: 'inherit', padding: 0 }}
        >
          ← {substance.nom}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 28, fontWeight: 400, margin: 0 }}>
            New Analysis — {substance.nom}
          </h1>
          <button onClick={handleSubmit} disabled={submitting || !hasAnyData} className="btn btn-primary">
            {submitting ? 'Saving…' : 'Submit'}
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          GCxGC composition is entered separately — <button
            onClick={() => navigate(`/gcxgc?substance_id=${substance.substance_id}`)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}
          >open the GC×GC page →</button>
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* ── Left: filter panel ─────────────────────────────────────────── */}
        <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', padding: 16 }}>
          <div className="section-label">Fields to show</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <button
              onClick={() => setFieldMode('all')}
              className={`btn btn-sm ${fieldMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
            >
              All
            </button>
            <button
              onClick={() => setFieldMode('select')}
              className={`btn btn-sm ${fieldMode === 'select' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
            >
              Select
            </button>
          </div>

          <input
            placeholder="Search properties…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="field"
            style={{ fontSize: 13, padding: '7px 10px', width: '100%', marginBottom: 14 }}
          />

          {fieldMode === 'select' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {groups.map(g => {
                const groupProps = groupedProps.get(g.id) ?? []
                if (groupProps.length === 0) return null
                const allSelected = groupProps.every(p => selectedPropIds.has(p.property_id))
                return (
                  <div key={g.id}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 4 }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={e => {
                          setSelectedPropIds(prev => {
                            const next = new Set(prev)
                            groupProps.forEach(p => e.target.checked ? next.add(p.property_id) : next.delete(p.property_id))
                            return next
                          })
                        }}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      {g.name} ({groupProps.length})
                    </label>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Right: form ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 36px' }}>
          <FormSection title="Scalar Properties">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {visibleProps.filter(p => p.kind === 'scalar').map(p => (
                <div key={p.property_id}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    {p.property_name} {p.standard_unit ? `(${p.standard_unit})` : ''}
                  </label>
                  <input
                    type="number"
                    value={scalarValues[p.property_id] ?? ''}
                    onChange={e => setScalarValues(prev => ({ ...prev, [p.property_id]: e.target.value }))}
                    placeholder={p.standard_unit ?? 'value'}
                    className="field"
                    style={{ fontSize: 13, padding: '7px 10px', width: '100%' }}
                  />
                </div>
              ))}
              {visibleProps.filter(p => p.kind === 'scalar').length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No scalar properties match the current filter.</p>
              )}
            </div>
          </FormSection>

          <FormSection title="Series Properties">
            {visibleProps.filter(p => p.kind === 'series').map(p => (
              <SeriesEntry
                key={p.property_id}
                label={p.property_name}
                unit={p.standard_unit}
                points={seriesPoints[p.property_id] ?? [{ x: '', y: '' }]}
                onChange={pts => setSeriesPoints(prev => ({ ...prev, [p.property_id]: pts }))}
              />
            ))}
          </FormSection>

          <FormSection title="Distillation">
            {visibleProps.filter(p => p.kind === 'distillation').map(p => (
              <SeriesEntry
                key={p.property_id}
                label={`${p.property_name} — % distilled vs. temperature`}
                unit={p.standard_unit}
                xLabel="% distilled"
                yLabel="Temp"
                points={seriesPoints[p.property_id] ?? [{ x: '', y: '' }]}
                onChange={pts => setSeriesPoints(prev => ({ ...prev, [p.property_id]: pts }))}
              />
            ))}
          </FormSection>
        </div>
      </div>
    </div>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <div className="section-label" style={{ marginBottom: 12 }}>{title}</div>
      {children}
    </section>
  )
}

function SeriesEntry({ label, unit, xLabel = 'x', yLabel = 'y', points, onChange }: {
  label: string; unit?: string | null; xLabel?: string; yLabel?: string
  points: { x: string; y: string }[]; onChange: (pts: { x: string; y: string }[]) => void
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{label} {unit ? `(${unit})` : ''}</div>
      {points.map((pt, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <input
            placeholder={xLabel} value={pt.x}
            onChange={e => { const next = [...points]; next[i] = { ...next[i], x: e.target.value }; onChange(next) }}
            className="field" style={{ fontSize: 12, padding: '5px 8px', width: 100 }}
          />
          <input
            placeholder={yLabel} value={pt.y}
            onChange={e => { const next = [...points]; next[i] = { ...next[i], y: e.target.value }; onChange(next) }}
            className="field" style={{ fontSize: 12, padding: '5px 8px', width: 100 }}
          />
          {i === points.length - 1 && (
            <button onClick={() => onChange([...points, { x: '', y: '' }])} className="btn btn-secondary btn-sm">+ point</button>
          )}
        </div>
      ))}
    </div>
  )
}