// src/pages/optimizer/Tab4Distillation.tsx
import { useEffect, useState } from 'react'
import { useOptimizerStore }                            from '@/store/optimizerStore'
import { useRunDistillationDesign, useRuns, useRun, useDeleteRun } from '@/api/optimizer'
import { DistillationChart }                            from '@/components/charts/DistillationChart'
import { PropertyTable }                                from '@/components/tables/PropertyTable'
import { CollapsiblePanel }                             from '@/components/ui/CollapsiblePanel'
import type { DistillationPoint, OptimizationResult, OptimizationRun } from '@/types'

const SPEC_POINTS = ['IBP', 'T10', 'T20', 'T50', 'T70', 'T90', 'FBP'] as const

// ── Run history entry ────────────────────────────────────────────────────────
function DesignRunEntry({ run, onLoad, onDelete }: {
  run: OptimizationRun
  onLoad: (result: OptimizationResult, name: string) => void
  onDelete: (id: string) => void
}) {
  const [enabled, setEnabled] = useState(false)
  const { data: fullRun, isFetching } = useRun(enabled ? run.run_id : null)

  useEffect(() => {
    if (fullRun?.results?.[0] && enabled) {
      onLoad(fullRun.results[0], fullRun.run_name)
      setEnabled(false)
    }
  }, [fullRun, enabled, onLoad])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 4,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{run.run_name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          {new Date(run.created_at).toLocaleString()}
        </div>
      </div>
      <button
        onClick={() => { if (fullRun?.results?.[0]) { onLoad(fullRun.results[0], fullRun.run_name); return } setEnabled(true) }}
        disabled={isFetching}
        className="btn btn-secondary btn-xs"
      >
        {isFetching ? '…' : 'Load'}
      </button>
      <button
        onClick={() => onDelete(run.run_id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', padding: '0 2px', transition: 'color 150ms', lineHeight: 1, fontFamily: 'inherit' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >×</button>
    </div>
  )
}

export default function Tab4Distillation() {
  const store     = useOptimizerStore()
  const designMut = useRunDistillationDesign()
  const deleteMut = useDeleteRun()
  const { data: designRuns = [] } = useRuns(undefined, 50, 0, 'distillation')

  const [cfgOpen, setCfgOpen]       = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [distCurve, setDistCurve]   = useState<DistillationPoint[]>([])
  const [distPts, setDistPts]       = useState<Record<string, number>>({})
  const [designResult, setDesignResult] = useState<{
    result: OptimizationResult
    specStatus: Record<string, { achieved: number; met: boolean; lo: number | null; hi: number | null; target: number | null }>
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDesignRun = () => {
    if (!store.selectedIds.length) { setError('Select pool substances first'); return }
    setError(null)
    setDesignResult(null)

    const dist_spec: Record<string, { target: number; lo?: number; hi?: number }> = {}
    SPEC_POINTS.forEach(key => {
      const pt = store.distSpec[key]
      if (!pt?.enabled) return
      const entry: { target: number; lo?: number; hi?: number } = { target: pt.target }
      if (pt.lo != null) entry.lo = pt.lo
      if (pt.hi != null) entry.hi = pt.hi
      dist_spec[key] = entry
    })

    if (Object.keys(dist_spec).length === 0) {
      setError('Enable at least one spec point')
      return
    }

    designMut.mutate(
      {
        substance_ids: store.selectedIds,
        dist_spec,
        availability_limits: store.availabilityLimits,
        fp_basis: store.fpBasis,
      },
      {
        onSuccess: res => {
          const data = res.data
          if (data.errors?.length) { setError(data.errors[0]); return }
          const r = data.results?.[0]
          if (r) {
            setDesignResult({ result: r, specStatus: data.spec_status ?? {} })
            store.setLastRunComposition(r.composition)
            if (r.eos_distillation_pts) {
              const pts = r.eos_distillation_pts as Record<string, number>
              setDistPts(pts)
            }
          }
        },
        onError: (e: unknown) => {
          setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Optimization failed')
        },
      }
    )
  }

  const handleLoadRun = (r: OptimizationResult, _name: string) => {
    store.setLastRunComposition(r.composition)
    setDesignResult({ result: r, specStatus: {} })
    if (r.eos_distillation_pts) setDistPts(r.eos_distillation_pts as Record<string, number>)
    if (r.eos_distillation_curve) setDistCurve(r.eos_distillation_curve)
    setError(null)
    setShowHistory(false)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Controls (collapsible) ────────────────────────────────────────── */}
      <CollapsiblePanel open={cfgOpen} onToggle={() => setCfgOpen(v => !v)} width={300}>
      <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}>
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(v => !v)}
            className={`btn btn-secondary btn-sm${showHistory ? ' btn-active' : ''}`}
            style={{ width: '100%' }}
          >
            History {designRuns.length > 0 ? `(${designRuns.length})` : ''}
          </button>

          {showHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
              {designRuns.length === 0 ? (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>No saved design runs yet.</p>
              ) : designRuns.map(run => (
                <DesignRunEntry
                  key={run.run_id}
                  run={run}
                  onLoad={handleLoadRun}
                  onDelete={id => deleteMut.mutate(id)}
                />
              ))}
            </div>
          )}

          {/* Spec editor */}
          <section>
            <label className="section-label">Distillation Spec</label>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
              Enable points and set target + optional bounds. The optimizer finds a blend minimizing deviation from targets.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SPEC_POINTS.map(key => {
                const pt = store.distSpec[key] ?? { target: 200, lo: null, hi: null, enabled: false }
                return (
                  <div key={key} style={{
                    border: `1px solid ${pt.enabled ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 5, padding: 8,
                    background: pt.enabled ? 'var(--accent-muted)' : 'transparent',
                    transition: 'all 150ms',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: pt.enabled ? 8 : 0 }}>
                      <input
                        type="checkbox"
                        checked={pt.enabled}
                        onChange={e => store.setDistSpec(key, { ...pt, enabled: e.target.checked })}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 600, color: pt.enabled ? 'var(--accent)' : 'var(--text-secondary)', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                        {key}
                      </span>
                      {pt.enabled && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>°C</span>
                      )}
                    </div>
                    {pt.enabled && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                        {[
                          { label: 'Target', field: 'target' as const },
                          { label: 'Min',    field: 'lo'     as const },
                          { label: 'Max',    field: 'hi'     as const },
                        ].map(({ label, field }) => (
                          <div key={field}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                            <input
                              type="number" step={1}
                              value={pt[field] ?? ''}
                              placeholder={field !== 'target' ? 'opt.' : ''}
                              onChange={e => {
                                const v = e.target.value === '' ? null : Number(e.target.value)
                                store.setDistSpec(key, { ...pt, [field]: v })
                              }}
                              className="field"
                              style={{ width: '100%', fontSize: 11, padding: '3px 6px' }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Run button */}
          <button
            onClick={handleDesignRun}
            disabled={designMut.isPending || !store.selectedIds.length}
            className="btn btn-primary btn-sm"
            style={{ width: '100%' }}
          >
            {designMut.isPending ? 'Optimizing…' : '▶ Find Blend'}
          </button>

        </div>
      </div>
      </CollapsiblePanel>

      {/* ── Results ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 4, fontSize: 12, color: 'var(--danger)',
          }}>
            {error}
          </div>
        )}

        {designMut.isPending && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
            <div className="spinner" />
          </div>
        )}

        {designResult && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Distillation Design — {designResult.result.converged ? '✓ Converged' : '✗ Not converged'}
                </h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Objective: {designResult.result.objective_value.toExponential(3)}
                </span>
              </div>
              <button
                onClick={() => { setDesignResult(null); setDistCurve([]); setDistPts({}) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)', fontFamily: 'inherit', lineHeight: 1 }}
              >×</button>
            </div>

            {/* Spec status */}
            {Object.keys(designResult.specStatus).length > 0 && (
              <section>
                <span className="section-label">Spec Status</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {SPEC_POINTS.filter(k => designResult.specStatus[k]).map(k => {
                    const s = designResult.specStatus[k]
                    return (
                      <div key={k} style={{
                        padding: '8px 14px', borderRadius: 6, textAlign: 'center', minWidth: 80,
                        border: `1px solid ${s.met ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                        background: s.met ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                      }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k}</div>
                        <div style={{ fontSize: 15, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, color: s.met ? 'var(--success)' : 'var(--danger)', marginTop: 2 }}>
                          {s.achieved.toFixed(1)}°C
                        </div>
                        {s.target != null && (
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>tgt {s.target}°C</div>
                        )}
                        <div style={{ fontSize: 9, marginTop: 2, color: s.met ? 'var(--success)' : 'var(--danger)' }}>
                          {s.met ? '✓ MET' : '✗ MISS'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Key dist points */}
            {Object.keys(distPts).length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['ibp', 't10', 't20', 't30', 't50', 't70', 't90', 'fbp'].map(k =>
                  distPts[k] != null && (
                    <div key={k} style={{
                      padding: '7px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)',
                      borderRadius: 4, textAlign: 'center', minWidth: 60,
                    }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k}</div>
                      <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                        {distPts[k].toFixed(1)}°C
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Distillation curve */}
            {distCurve.length > 0 && (
              <DistillationChart curve={distCurve} points={distPts} showSpec />
            )}

            {/* Composition */}
            <section>
              <span className="section-label">Blend Composition</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 600 }}>
                {Object.entries(designResult.result.composition).sort(([, a], [, b]) => b - a).map(([sid, frac]) => (
                  <div key={sid} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>{sid}</span>
                    <div style={{ flex: 1, height: 7, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 3, width: `${(frac * 100).toFixed(1)}%` }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)', width: 52, textAlign: 'right' }}>{(frac * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <span className="section-label">Computed Properties</span>
              <PropertyTable props={designResult.result.computed_properties} />
            </section>
          </>
        )}

        {!designMut.isPending && !designResult && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Enable spec points, then click Find Blend
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
