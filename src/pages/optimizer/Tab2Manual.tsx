// src/pages/optimizer/Tab2Manual.tsx
import { useEffect, useRef, useState } from 'react'
import { CollapsiblePanel } from '@/components/ui/CollapsiblePanel'
import { useOptimizerStore } from '@/store/optimizerStore'
import type { MixingBehavior } from '@/store/optimizerStore'
import {
  useComputeBlend, usePoolSubstances, useGCxGCSubfamilyTotals,
  useGCxGCTable, useBatchQuantities, useSaveManualRun,
  useRuns, useRun, useDeleteRun,
  useEosDistillation, useEosPvap,
} from '@/api/optimizer'
import { PropertyTable } from '@/components/tables/PropertyTable'
import { CarbonProfileChart }       from '@/components/charts/CarbonProfileChart'
import { FamilyPieChart }           from '@/components/charts/FamilyPieChart'
import { SubfamilyTable }           from '@/components/charts/GCxGCHeatmap'
import { FamilyCarbonProfileChart } from '@/components/charts/FamilyCarbonProfileChart'
import { DistillationChart, PvapChart } from '@/components/charts/DistillationChart'
import { FuelSpecChecker } from '@/components/ui/FuelSpecChecker'
import type { ComputedProperties, OptimizationResult, OptimizationRun, DistillationPoint, PvapPoint } from '@/types'

interface BatchResult {
  blend_density_g_ml: number
  total_mass_g: number
  target_volume_ml: number
  components: { substance_id: string; name: string; mass_fraction: number; mass_g: number; volume_ml: number | null }[]
}

interface FullResult {
  properties: ComputedProperties
  carbon_profile: number[]
  composition: Record<string, number>
  eos_distillation_curve?: DistillationPoint[] | null
  eos_pvap_curve?: PvapPoint[] | null
}

function downloadBlob(content: string, filename: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── Run history entry (lazy-load pattern from Studio) ────────────────────────
function ManualRunEntry({ run, onLoad, onDelete }: {
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

export default function Tab2Manual() {
  const store      = useOptimizerStore()
  const computeMut = useComputeBlend()
  const saveRunMut = useSaveManualRun()
  const deleteMut  = useDeleteRun()
  const { data: allSubstances = [] } = usePoolSubstances()
  const { data: manualRuns = [] }    = useRuns(undefined, 50, 0, 'manual')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [cfgOpen, setCfgOpen]       = useState(true)
  const [blendName, setBlendName]   = useState('My Blend')
  const [showHistory, setShowHistory] = useState(false)
  const [result, setResult]         = useState<FullResult | null>(null)
  const [saveError, setSaveError]   = useState<string | null>(null)

  const eosDist = useEosDistillation()
  const eosPvap = useEosPvap()
  const [eosDistCurve, setEosDistCurve] = useState<DistillationPoint[] | null>(null)
  const [eosPvapCurve, setEosPvapCurve] = useState<PvapPoint[] | null>(null)
  const [eosStepSize, setEosStepSizeLocal]   = useState(store.eosStepSize)
  const [eosMixing, setEosMixing]            = useState<MixingBehavior>(store.eosMixingBehavior)

  const subfamMut  = useGCxGCSubfamilyTotals()
  const gcxgcMut   = useGCxGCTable()
  const batchMut   = useBatchQuantities()
  const [subfamTotals, setSubfamTotals]   = useState<Record<string, number>>({})
  const [subfamLoaded, setSubfamLoaded]   = useState(false)
  const [gcxgcRows, setGcxgcRows]         = useState<Record<string, number | string>[]>([])
  const [gcxgcLoaded, setGcxgcLoaded]     = useState(false)
  const [batchVolume, setBatchVolume]     = useState<string>('100')
  const [batchResult, setBatchResult]     = useState<BatchResult | null>(null)

  const rawSum = Object.values(store.manualComposition).reduce((a, b) => a + b, 0)
  const normFracs = rawSum > 0
    ? Object.fromEntries(
        Object.entries(store.manualComposition).map(([k, v]) => [k, v / rawSum])
      )
    : store.manualComposition

  const clearSecondaryState = () => {
    setSubfamTotals({})
    setSubfamLoaded(false)
    setGcxgcRows([])
    setGcxgcLoaded(false)
    setBatchResult(null)
    setSaveError(null)
    setEosDistCurve(null)
    setEosPvapCurve(null)
  }

  const handleCompute = () => {
    const nonZero = Object.fromEntries(
      Object.entries(normFracs).filter(([, v]) => v > 0)
    )
    if (!Object.keys(nonZero).length) return
    clearSecondaryState()
    computeMut.mutate(
      { composition: nonZero, fp_basis: store.fpBasis },
      {
        onSuccess: res => setResult({
          properties:    res.data.properties,
          carbon_profile: res.data.carbon_profile,
          composition:   res.data.composition,
        }),
      }
    )
  }

  const handleComputeAndSave = () => {
    const nonZero = Object.fromEntries(
      Object.entries(normFracs).filter(([, v]) => v > 0)
    )
    if (!Object.keys(nonZero).length) return
    clearSecondaryState()
    saveRunMut.mutate(
      {
        run_name:    blendName || 'Manual Run',
        composition: nonZero,
        fp_basis:    store.fpBasis,
      },
      {
        onSuccess: res => {
          const r = res.data.result
          setResult({
            properties:    r.computed_properties,
            carbon_profile: res.data.carbon_profile ?? [],
            composition:   r.composition,
          })
        },
        onError: (e: unknown) => {
          const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Save failed'
          setSaveError(msg)
        },
      }
    )
  }

  const handleLoadRun = (r: OptimizationResult, name: string) => {
    setBlendName(name)
    store.setManualComposition(r.composition)
    clearSecondaryState()
    setShowHistory(false)
    // Set result immediately with whatever we have, then fetch carbon_profile silently
    setResult({
      properties:             r.computed_properties,
      carbon_profile:         [],
      composition:            r.composition,
      eos_distillation_curve: r.eos_distillation_curve,
      eos_pvap_curve:         r.eos_pvap_curve,
    })
    computeMut.mutate(
      { composition: r.composition, fp_basis: store.fpBasis },
      { onSuccess: res => setResult(prev => prev ? { ...prev, carbon_profile: res.data.carbon_profile } : prev) }
    )
  }

  const handleSaveBlend = () => {
    const payload = {
      name: blendName,
      fp_basis: store.fpBasis,
      composition: Object.fromEntries(
        Object.entries(normFracs).filter(([, v]) => v > 0)
      ),
    }
    downloadBlob(
      JSON.stringify(payload, null, 2),
      `${blendName.replace(/\s+/g, '_')}.json`,
      'application/json',
    )
  }

  const handleLoadBlend = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.name) setBlendName(data.name)
        if (data.fp_basis) store.setFpBasis(data.fp_basis)
        if (data.composition && typeof data.composition === 'object') {
          Object.entries(data.composition as Record<string, number>).forEach(([sid, val]) => {
            store.setManualFraction(sid, val * 100)
          })
        }
      } catch {
        // ignore malformed file
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExportCSV = () => {
    if (!result) return
    const propRows = Object.entries(result.properties)
      .map(([k, v]) => `${k},${v ?? ''}`)
      .join('\n')
    const compRows = Object.entries(result.composition)
      .map(([k, v]) => `${k},${(v * 100).toFixed(4)}`)
      .join('\n')
    const csv = `# ${blendName}\n# Composition (%)\nsubstance_id,fraction_pct\n${compRows}\n\n# Properties\nproperty,value\n${propRows}`
    downloadBlob(csv, `${blendName.replace(/\s+/g, '_')}.csv`, 'text/csv')
  }

  const displayed = store.selectedIds.length
    ? allSubstances.filter(s => store.selectedIds.includes(s.substance_id))
    : allSubstances

  const isComputing = computeMut.isPending || saveRunMut.isPending

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left — composition inputs (collapsible) ──────────────────────── */}
      <CollapsiblePanel open={cfgOpen} onToggle={() => setCfgOpen(v => !v)} width={320}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

        {/* Header: name + file save/load */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={blendName}
            onChange={e => setBlendName(e.target.value)}
            placeholder="Blend name"
            className="field"
            style={{ fontSize: 13, fontWeight: 600, padding: '5px 8px' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleSaveBlend}
              disabled={rawSum === 0}
              className="btn btn-secondary btn-xs"
              style={{ flex: 1 }}
            >
              Save JSON
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary btn-xs"
              style={{ flex: 1 }}
            >
              Load JSON
            </button>
            <button
              onClick={() => setShowHistory(v => !v)}
              className={`btn btn-secondary btn-xs${showHistory ? ' btn-active' : ''}`}
              style={{ flex: 1 }}
            >
              History {manualRuns.length > 0 ? `(${manualRuns.length})` : ''}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleLoadBlend}
            />
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
            Enter fractions — normalised automatically
          </p>
        </div>

        {/* Run history panel */}
        {showHistory && (
          <div style={{
            borderBottom: '1px solid var(--border)',
            padding: '10px 14px',
            maxHeight: 260, overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {manualRuns.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>No saved runs yet.</p>
            ) : manualRuns.map(run => (
              <ManualRunEntry
                key={run.run_id}
                run={run}
                onLoad={handleLoadRun}
                onDelete={id => deleteMut.mutate(id)}
              />
            ))}
          </div>
        )}

        {/* Composition inputs */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {displayed.map(s => (
            <div key={s.substance_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.nom}
              </span>
              <input
                type="number" min={0} max={100} step={0.01}
                value={store.manualComposition[s.substance_id] ?? 0}
                onChange={e => store.setManualFraction(s.substance_id, Number(e.target.value))}
                className="field"
                style={{ width: 80, textAlign: 'right', fontSize: 12, padding: '4px 8px' }}
              />
              {rawSum > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 40, textAlign: 'right', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                  {((normFracs[s.substance_id] ?? 0) * 100).toFixed(1)}%
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Bottom controls: FP basis + EOS + compute buttons */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>FP basis</span>
            <select
              value={store.fpBasis}
              onChange={e => store.setFpBasis(e.target.value as 'mole' | 'mass')}
              className="field"
              style={{ flex: 1, fontSize: 12, padding: '5px 8px' }}
            >
              <option value="mole">Mole</option>
              <option value="mass">Mass</option>
            </select>
          </div>

          {saveError && (
            <p style={{ fontSize: 11, color: 'var(--danger)', margin: 0 }}>{saveError}</p>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleCompute}
              disabled={rawSum === 0 || isComputing}
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: 12 }}
            >
              {computeMut.isPending ? 'Computing…' : 'Compute'}
            </button>
            <button
              onClick={handleComputeAndSave}
              disabled={rawSum === 0 || isComputing}
              className="btn btn-primary"
              style={{ flex: 1, fontSize: 12 }}
            >
              {saveRunMut.isPending ? 'Saving…' : 'Compute & Save'}
            </button>
          </div>
        </div>
      </div>
      </CollapsiblePanel>

      {/* ── Right — results ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {!result && !isComputing && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Enter a composition and compute</p>
          </div>
        )}
        {isComputing && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="spinner" />
          </div>
        )}
        {result && (
          <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Export row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{blendName}</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => downloadBlob(
                    JSON.stringify({ name: blendName, composition: result.composition, properties: result.properties }, null, 2),
                    `${blendName.replace(/\s+/g, '_')}_result.json`,
                    'application/json',
                  )}
                  className="btn btn-secondary btn-xs"
                >JSON</button>
                <button onClick={handleExportCSV} className="btn btn-secondary btn-xs">CSV</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ flex: 2 }}>
                <CarbonProfileChart values={result.carbon_profile} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <FamilyPieChart
                  nPara={result.properties.n_paraffins_pct}
                  isoPara={result.properties.isoparaffins_pct}
                  cyclo={result.properties.cyclopara_pct}
                  arom={result.properties.aromatics_pct}
                />
              </div>
            </div>

            {/* Subfamily totals (lazy) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Subfamily Composition
                </span>
                {!subfamLoaded && (
                  <button
                    className="btn"
                    style={{ fontSize: 11, padding: '3px 10px' }}
                    onClick={() => {
                      setSubfamLoaded(true)
                      subfamMut.mutate(result.composition, {
                        onSuccess: res => setSubfamTotals(res.data.totals),
                      })
                    }}
                  >
                    Load
                  </button>
                )}
              </div>
              {subfamLoaded && subfamMut.isPending && <div className="spinner" style={{ margin: '8px auto' }} />}
              {Object.keys(subfamTotals).length > 0 && <SubfamilyTable totals={subfamTotals} />}
            </div>

            {/* Per-family carbon profile (lazy) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Per-Family Carbon Profile
                </span>
                {!gcxgcLoaded && (
                  <button
                    className="btn"
                    style={{ fontSize: 11, padding: '3px 10px' }}
                    onClick={() => {
                      setGcxgcLoaded(true)
                      gcxgcMut.mutate(result.composition, {
                        onSuccess: res => setGcxgcRows(res.data.table),
                      })
                    }}
                  >
                    Load
                  </button>
                )}
              </div>
              {gcxgcLoaded && gcxgcMut.isPending && <div className="spinner" style={{ margin: '8px auto' }} />}
              {gcxgcRows.length > 0 && <FamilyCarbonProfileChart rows={gcxgcRows} height={220} />}
            </div>

            <PropertyTable props={result.properties} />

            {/* EOS section — manual post-compute step */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>EOS Curves</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Step</span>
                    <input
                      type="number" min={0.005} max={0.1} step={0.005}
                      value={eosStepSize}
                      onChange={e => setEosStepSizeLocal(Number(e.target.value))}
                      className="field"
                      style={{ width: 72, fontSize: 11, padding: '3px 6px', textAlign: 'right' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mixing</span>
                    <select
                      value={eosMixing}
                      onChange={e => setEosMixing(e.target.value as MixingBehavior)}
                      className="field"
                      style={{ fontSize: 11, padding: '3px 6px' }}
                    >
                      <option value="Ideal">Ideal</option>
                      <option value="Real">Van der Waals (Real)</option>
                    </select>
                  </div>
                  <button
                    className="btn btn-secondary btn-xs"
                    disabled={eosDist.isPending}
                    onClick={() => eosDist.mutate(
                      { composition: result.composition, step_size: eosStepSize, mixing_behavior: eosMixing },
                      { onSuccess: res => setEosDistCurve(res.data.curve) }
                    )}
                  >
                    {eosDist.isPending ? 'Running…' : 'Distillation'}
                  </button>
                  <button
                    className="btn btn-secondary btn-xs"
                    disabled={eosPvap.isPending}
                    onClick={() => eosPvap.mutate(
                      { composition: result.composition, mixing_behavior: eosMixing },
                      { onSuccess: res => setEosPvapCurve(res.data.curve) }
                    )}
                  >
                    {eosPvap.isPending ? 'Running…' : 'Pvap'}
                  </button>
                </div>
              </div>

              {(eosDist.isPending || eosPvap.isPending) && (
                <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
                  <div className="spinner" />
                </div>
              )}

              {eosDistCurve && eosDistCurve.length > 0 && (
                <div style={{ padding: '12px 14px', borderBottom: eosDistCurve && eosPvapCurve ? '1px solid var(--border)' : undefined }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Distillation Curve</div>
                  <DistillationChart curve={eosDistCurve} />
                </div>
              )}

              {eosPvapCurve && eosPvapCurve.length > 0 && (
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Vapor Pressure</div>
                  <PvapChart curve={eosPvapCurve} />
                </div>
              )}

              {!eosDistCurve && !eosPvapCurve && !eosDist.isPending && !eosPvap.isPending && (
                <div style={{ padding: '20px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Click a button above to run EOS calculations</p>
                </div>
              )}
            </div>

            {/* Fuel spec compliance */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                Fuel Spec Compliance
              </div>
              <FuelSpecChecker props={result.properties} />
            </div>

            {/* Batch quantities */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                Batch Calculator
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>Target volume</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={batchVolume}
                  onChange={e => setBatchVolume(e.target.value)}
                  className="field"
                  style={{ width: 100, fontSize: 13, textAlign: 'right' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>mL</span>
                <button
                  className="btn btn-sm"
                  disabled={batchMut.isPending || !batchVolume}
                  onClick={() => {
                    const vol = Number(batchVolume)
                    if (!vol) return
                    batchMut.mutate(
                      { composition: result.composition, target_volume_ml: vol },
                      { onSuccess: res => {
                          const d = res.data
                          setBatchResult({
                            blend_density_g_ml: d.blend_density_g_ml,
                            total_mass_g: d.total_mass_g,
                            target_volume_ml: d.target_volume_ml,
                            components: d.components,
                          })
                        },
                      }
                    )
                  }}
                >
                  {batchMut.isPending ? 'Calculating…' : 'Calculate'}
                </button>
              </div>

              {batchResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{
                    display: 'flex', gap: 20,
                    padding: '10px 14px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                  }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Blend density</div>
                      <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)' }}>
                        {batchResult.blend_density_g_ml.toFixed(4)}
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 5 }}>g/mL</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Total mass</div>
                      <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)' }}>
                        {batchResult.total_mass_g.toFixed(2)}
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 5 }}>g</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Volume</div>
                      <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)' }}>
                        {batchResult.target_volume_ml}
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 5 }}>mL</span>
                      </div>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-elevated)' }}>
                        <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>Component</th>
                        <th style={{ padding: '6px 12px', textAlign: 'right', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>Mass frac.</th>
                        <th style={{ padding: '6px 12px', textAlign: 'right', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>Mass (g)</th>
                        <th style={{ padding: '6px 12px', textAlign: 'right', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>Volume (mL)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchResult.components
                        .filter(c => c.mass_fraction > 0.0001)
                        .sort((a, b) => b.mass_fraction - a.mass_fraction)
                        .map(c => (
                          <tr key={c.substance_id} style={{ borderTop: '1px solid var(--border)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ padding: '6px 12px', color: 'var(--text-primary)' }}>{c.name}</td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-secondary)' }}>
                              {(c.mass_fraction * 100).toFixed(2)}%
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)', fontWeight: 500 }}>
                              {c.mass_g.toFixed(3)}
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-secondary)' }}>
                              {c.volume_ml != null ? c.volume_ml.toFixed(2) : '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
