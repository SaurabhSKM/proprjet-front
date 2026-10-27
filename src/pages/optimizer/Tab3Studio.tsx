// src/pages/optimizer/Tab3Studio.tsx
// Studio = per-family carbon profiles + component caps + property constraints
import { useState, useEffect } from 'react'
import { useOptimizerStore }                        from '@/store/optimizerStore'
import { useRunOptimizer, useRuns, useDeleteRun,
         useRun }                                   from '@/api/optimizer'
import { PropertyTable }                            from '@/components/tables/PropertyTable'
import { FamilyPieChart }                           from '@/components/charts/FamilyPieChart'
import { CollapsiblePanel }                         from '@/components/ui/CollapsiblePanel'
import type { Scenario, PropertyConstraint }        from '@/store/optimizerStore'
import type { OptimizationResult, OptimizationRun } from '@/types'

const PF_SCENARIOS: Scenario[] = [
  'Balanced (per-family)',
  'Auto-Balanced (per-family)',
  'Carbon Profile Only (per-family)',
]

const FAMILIES = ['npara', 'isopara', 'cyclo', 'arom'] as const
const FAMILY_LABELS: Record<string, string> = {
  npara: 'n-Paraffins', isopara: 'Isoparaffins',
  cyclo: 'Cycloparaffins', arom: 'Aromatics',
}
const CARBONS = Array.from({ length: 20 }, (_, i) => `C${i + 6}`)

// ─── Property constraint definitions ─────────────────────────────────────────
const PROP_CONSTRAINTS = [
  { propKey: 'density_sv_g_ml', label: 'Density',      unit: 'g/mL',   step: 0.001, defLo: 0.70, defHi: 0.85 },
  { propKey: 'fp_mi_degC',      label: 'Flash Point',  unit: '°C',     step: 1,     defLo: 20,   defHi: 80   },
  { propKey: 'kv_p40_linear',   label: 'KV @40°C',     unit: 'mm²/s',  step: 0.01,  defLo: 1.0,  defHi: 5.0  },
  { propKey: 'lhv_linear',      label: 'LHV',          unit: 'MJ/kg',  step: 0.1,   defLo: 40,   defHi: 48   },
  { propKey: 'cmass',           label: 'C mass',       unit: 'g/100g', step: 0.1,   defLo: 84,   defHi: 88   },
  { propKey: 'dist_t50_linear', label: 'T50',          unit: '°C',     step: 1,     defLo: 180,  defHi: 240  },
  { propKey: 'dist_t10_linear', label: 'T10',          unit: '°C',     step: 1,     defLo: 150,  defHi: 200  },
  { propKey: 'dist_t90_linear', label: 'T90',          unit: '°C',     step: 1,     defLo: 220,  defHi: 280  },
]

const MODE_OPTS: { value: PropertyConstraint['mode']; label: string }[] = [
  { value: 'off',   label: 'Off' },
  { value: 'min',   label: '≥'   },
  { value: 'max',   label: '≤'   },
  { value: 'range', label: '↔'   },
]

function PropConstraintRow({ propKey, label, unit, step, defLo, defHi }: {
  propKey: string; label: string; unit: string; step: number; defLo: number; defHi: number
}) {
  const { propertyConstraints, setPropertyConstraint } = useOptimizerStore()
  const c = propertyConstraints[propKey] ?? { mode: 'off', lo: defLo, hi: defHi }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '88px 96px 1fr 1fr', gap: 6,
      alignItems: 'center', padding: '4px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{label}</span>

      {/* mode buttons */}
      <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        {MODE_OPTS.map(m => (
          <button
            key={m.value}
            onClick={() => setPropertyConstraint(propKey, { ...c, mode: m.value })}
            style={{
              flex: 1, padding: '2px 0', fontSize: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 120ms',
              background: c.mode === m.value ? 'var(--accent-muted)' : 'transparent',
              color: c.mode === m.value ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >{m.label}</button>
        ))}
      </div>

      {/* lo */}
      <input
        type="number" step={step}
        value={c.lo}
        disabled={c.mode === 'off' || c.mode === 'max'}
        onChange={e => setPropertyConstraint(propKey, { ...c, lo: Number(e.target.value) })}
        className="field"
        style={{ fontSize: 11, padding: '3px 6px', opacity: (c.mode === 'off' || c.mode === 'max') ? 0.3 : 1 }}
        title={`Min ${label} (${unit})`}
      />

      {/* hi */}
      <input
        type="number" step={step}
        value={c.hi}
        disabled={c.mode === 'off' || c.mode === 'min'}
        onChange={e => setPropertyConstraint(propKey, { ...c, hi: Number(e.target.value) })}
        className="field"
        style={{ fontSize: 11, padding: '3px 6px', opacity: (c.mode === 'off' || c.mode === 'min') ? 0.3 : 1 }}
        title={`Max ${label} (${unit})`}
      />
    </div>
  )
}

function PerFamilyProfileEditor({ family, values, onChange }: {
  family: string; values: number[]; onChange: (v: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const total = values.reduce((a, b) => a + b, 0)

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 8, marginBottom: 6 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', padding: 0,
        }}
      >
        <span>{FAMILY_LABELS[family] ?? family}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Σ={total.toFixed(2)} {open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {CARBONS.map((cn, i) => (
            <div key={cn} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <label style={{ fontSize: 8, color: 'var(--text-muted)', marginBottom: 2 }}>{cn}</label>
              <input
                type="number" min={0} max={1} step={0.01}
                value={values[i] ?? 0}
                onChange={e => { const next = [...values]; next[i] = Number(e.target.value); onChange(next) }}
                className="field"
                style={{ width: '100%', fontSize: 10, padding: '2px 4px', textAlign: 'right' }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Tab3Studio() {
  const store     = useOptimizerStore()
  const runMut    = useRunOptimizer()
  const deleteMut = useDeleteRun()
  const { data: runs = [] } = useRuns()

  const [cfgOpen, setCfgOpen]         = useState(true)
  const [result, setResult]           = useState<OptimizationResult | null>(null)
  const [resultRunName, setRunName]   = useState('')
  const [errors, setErrors]           = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Build property_constraints payload — only include non-off entries
  const buildPropConstraints = () => {
    const pc: Record<string, { mode: string; lo: number; hi: number }> = {}
    Object.entries(store.propertyConstraints).forEach(([k, c]) => {
      if (c.mode !== 'off') pc[k] = c
    })
    return Object.keys(pc).length > 0 ? pc : undefined
  }

  const handleRun = () => {
    if (!store.selectedIds.length) return
    setErrors([])
    const payload: Record<string, unknown> = {
      substance_ids:        store.selectedIds,
      targets:              store.targets,
      scenario:             store.scenario,
      n_restarts:           store.nRestarts,
      fp_basis:             store.fpBasis,
      carbon_dist:          store.carbonDist,
      family_constraints:   store.familyConstraints,
      component_caps:       store.componentCaps,
      availability_limits:  store.availabilityLimits,
      property_constraints: buildPropConstraints(),
    }
    if (store.sparsity)                       payload.sparsity   = store.sparsity
    if (Object.keys(store.pfTargets).length)  payload.pf_targets = store.pfTargets

    runMut.mutate(payload, {
      onSuccess: res => {
        const data = res.data
        if (data.errors?.length) { setErrors(data.errors); return }
        const r = data.results?.[0]
        if (r) { setResult(r); setRunName(store.scenario); store.setLastRunComposition(r.composition) }
        store.setActiveRunId(data.run_id)
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setErrors([msg ?? 'Run failed'])
      },
    })
  }

  const activeConstraints = Object.values(store.propertyConstraints).filter(c => c.mode !== 'off').length

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left — Studio controls (collapsible) ─────────────────────────── */}
      <CollapsiblePanel open={cfgOpen} onToggle={() => setCfgOpen(v => !v)} width={380}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Scenario */}
          <section>
            <label className="section-label">Scenario</label>
            <select value={store.scenario} onChange={e => store.setScenario(e.target.value as Scenario)} className="field">
              {PF_SCENARIOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </section>

          {/* Per-Family Carbon Profiles */}
          <section>
            <label className="section-label">Per-Family Carbon Profiles</label>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
              C6–C25 target distribution per family (fractions).
            </p>
            {FAMILIES.map(fam => (
              <PerFamilyProfileEditor
                key={fam} family={fam}
                values={store.pfTargets[fam] ?? new Array(20).fill(0)}
                onChange={v => store.setPfTarget(fam, v)}
              />
            ))}
          </section>

          {/* Property Constraints */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="section-label" style={{ margin: 0 }}>Property Constraints</label>
              {activeConstraints > 0 && (
                <span style={{ fontSize: 9, color: 'var(--accent)', background: 'var(--accent-muted)', padding: '2px 6px', borderRadius: 8 }}>
                  {activeConstraints} active
                </span>
              )}
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '88px 96px 1fr 1fr', gap: '0 6px',
              marginBottom: 4,
            }}>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Property</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mode</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>Min</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>Max</span>
            </div>
            {PROP_CONSTRAINTS.map(p => (
              <PropConstraintRow key={p.propKey} {...p} />
            ))}
            <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
              Applied as linear mixing constraints (approximation).
            </p>
          </section>

          {/* Component Caps */}
          <section>
            <label className="section-label">Component Caps</label>
            {store.selectedIds.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Select pool substances first.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {store.selectedIds.map(sid => {
                const cap = store.componentCaps[sid] ?? { lo: 0, hi: 1 }
                return (
                  <div key={sid} style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                      {sid}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['lo', 'hi'] as const).map(k => (
                        <div key={k} style={{ flex: 1 }}>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{k === 'lo' ? 'Min' : 'Max'}</div>
                          <input
                            type="number" min={0} max={1} step={0.01}
                            value={cap[k]}
                            onChange={e => store.setComponentCap(sid, { ...cap, [k]: Number(e.target.value) })}
                            className="field"
                            style={{ width: '100%', fontSize: 11, padding: '3px 6px' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Family Targets */}
          <section>
            <label className="section-label">Family Targets (%)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {([['target_n', 'n-Par'], ['target_i', 'iso-Par'], ['target_c', 'Cyclo'], ['target_a', 'Arom']] as const).map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 52 }}>{label}</span>
                  <input
                    type="range" min={0} max={100} step={1}
                    value={store.targets[key]}
                    onChange={e => store.setTarget(key, Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent)' }}
                  />
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)', width: 30, textAlign: 'right' }}>
                    {store.targets[key]}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Run button */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {errors.length > 0 && (
            <div style={{
              marginBottom: 10, padding: '8px 12px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 4, fontSize: 11, color: 'var(--danger)',
            }}>
              {errors[0]}
            </div>
          )}
          <button
            onClick={handleRun}
            disabled={!store.selectedIds.length || runMut.isPending}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {runMut.isPending ? 'Optimizing…' : '▶  Run Studio'}
          </button>
        </div>
      </div>
      </CollapsiblePanel>

      {/* ── Right — results ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {runMut.isPending && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
          </div>
        )}
        {result && !runMut.isPending && (
          <div style={{ padding: 24, maxWidth: 840, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {resultRunName} — {result.result_name}
                </h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span>Objective: {result.objective_value.toExponential(3)}</span>
                  {result.converged
                    ? <span style={{ color: 'var(--success)' }}>✓ Converged</span>
                    : <span style={{ color: 'var(--danger)' }}>✗ Not converged</span>}
                </div>
              </div>
              <button
                onClick={() => setResult(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-muted)', padding: 0, lineHeight: 1, fontFamily: 'inherit' }}
              >×</button>
            </div>

            {/* Property constraint satisfaction */}
            {activeConstraints > 0 && (
              <section>
                <span className="section-label">Constraint Check</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PROP_CONSTRAINTS.filter(p => (store.propertyConstraints[p.propKey]?.mode ?? 'off') !== 'off').map(p => {
                    const c = store.propertyConstraints[p.propKey]
                    const val = result.computed_properties[p.propKey as keyof typeof result.computed_properties] as number | null
                    if (val == null) return null
                    const loOk = c.mode === 'max' || val >= c.lo
                    const hiOk = c.mode === 'min' || val <= c.hi
                    const met  = loOk && hiOk
                    return (
                      <div key={p.propKey} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                        border: `1px solid ${met ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        borderRadius: 5, background: met ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                        fontSize: 11,
                      }}>
                        <span style={{ color: met ? 'var(--success)' : 'var(--danger)' }}>{met ? '✓' : '✗'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{p.label}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)' }}>
                          {val.toFixed(3)} {p.unit}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <section>
              <span className="section-label">Composition</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {Object.entries(result.composition).sort(([, a], [, b]) => b - a).map(([sid, frac]) => (
                  <div key={sid} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>{sid}</span>
                    <div style={{ flex: 1, height: 7, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 3, width: `${(frac * 100).toFixed(1)}%` }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)', width: 52, textAlign: 'right' }}>{(frac * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <span className="section-label">Family Composition</span>
              <FamilyPieChart
                nPara={result.computed_properties.n_paraffins_pct}
                isoPara={result.computed_properties.isoparaffins_pct}
                cyclo={result.computed_properties.cyclopara_pct}
                arom={result.computed_properties.aromatics_pct}
              />
            </section>

            <section>
              <span className="section-label">Properties</span>
              <PropertyTable props={result.computed_properties} />
            </section>
          </div>
        )}
        {!result && !runMut.isPending && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, opacity: 0.08, marginBottom: 12, userSelect: 'none', color: 'var(--accent)' }}>◎</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Set per-family profiles and run the Studio optimizer
              </p>
              {runs.length > 0 && (
                <button
                  onClick={() => setShowHistory(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit', transition: 'color 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  {showHistory ? '▴ Hide' : '▾ Show'} run history ({runs.length})
                </button>
              )}
            </div>
          </div>
        )}
        {showHistory && !result && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '16px 24px' }}>
            <span className="section-label">Run History</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {runs.map(run => (
                <StudioRunEntry
                  key={run.run_id}
                  run={run}
                  onLoad={(r, name) => { setResult(r); setRunName(name); setShowHistory(false) }}
                  onDelete={id => deleteMut.mutate(id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StudioRunEntry({ run, onLoad, onDelete }: {
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
