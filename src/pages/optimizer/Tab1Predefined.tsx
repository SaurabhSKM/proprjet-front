// src/pages/optimizer/Tab1Predefined.tsx
import { useState, useEffect, useRef } from 'react'
import { useOptimizerStore }                           from '@/store/optimizerStore'
import { useAuth }                                     from '@/app/auth/services/useAuth'
import { useRunOptimizer, useRuns, useDeleteRun,
         useRun, useBatchQuantities, useGCxGCTable,
         useGCxGCSubfamilyTotals, useRunConfig,
         usePoolSubstances, useDiagnoseConstraints,
         useSubstanceProps }                           from '@/api/optimizer'
import type { DiagnoseResult, SubstanceProps }         from '@/api/optimizer'
import { useSubstanceGCxGCTargets,
         useParseGCxGCTargets }                        from '@/api/gcxgc'
import type { GCxGCTargets }                           from '@/api/gcxgc'
import { PropertyTable }                               from '@/components/tables/PropertyTable'
import { GCxGCHeatmap, SubfamilyTable }                from '@/components/charts/GCxGCHeatmap'
import { FamilyPieChart }                              from '@/components/charts/FamilyPieChart'
import { FamilyCarbonProfileChart }                    from '@/components/charts/FamilyCarbonProfileChart'
import { SumIndicator }                                 from '@/components/ui/primitives'
import { CollapsiblePanel }                             from '@/components/ui/CollapsiblePanel'
import { SCENARIO_DESCRIPTIONS }                       from '@/constants/eos'
import type { Scenario }                               from '@/store/optimizerStore'
import type { OptimizationResult, OptimizationRun }    from '@/types'

const SCENARIOS: Scenario[] = [
  'Balanced', 'Auto-Balanced', 'Cmass Only', 'Family Only',
  'Carbon Profile Only', 'Balanced (per-family)', 'Auto-Balanced (per-family)',
  'Carbon Profile Only (per-family)', 'Minimize Aromatics', 'High Isoparaffins',
]

const FAMILY_KEYS = ['npara', 'isopara', 'cyclo', 'arom'] as const
const FAMILY_LABELS: Record<string, string> = {
  npara: 'n-Paraffins', isopara: 'Isoparaffins',
  cyclo: 'Cycloparaffins', arom: 'Aromatics',
}

// ─────────────────────────────────────────────────────────────────────────────
// BatchQuantities sub-panel
// ─────────────────────────────────────────────────────────────────────────────
function BatchQuantitiesPanel({ composition }: { composition: Record<string, number> }) {
  const [volume, setVolume] = useState<string>('500')
  const batchMut = useBatchQuantities()
  const [result, setResult] = useState<{
    blend_density_g_ml: number
    total_mass_g: number
    target_volume_ml: number
    components: { substance_id: string; name: string; mass_g: number; volume_ml: number | null; mass_fraction: number }[]
  } | null>(null)

  const handleCompute = () => {
    const vol = Number(volume)
    if (!vol || vol <= 0) return
    batchMut.mutate(
      { composition, target_volume_ml: vol },
      { onSuccess: res => setResult(res.data) }
    )
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--bg-surface)' }}>
      <h4 style={{ fontSize: 12, letterSpacing: '0.15em', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 12px' }}>
        Batch Calculator
      </h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Target volume</span>
        <input
          type="number" min={1} value={volume}
          onChange={e => setVolume(e.target.value)}
          className="field"
          style={{ width: 80, textAlign: 'right', fontSize: 12, padding: '5px 8px' }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>mL</span>
        <button
          onClick={handleCompute}
          disabled={batchMut.isPending}
          className="btn btn-secondary btn-xs"
          style={{ marginLeft: 'auto' }}
        >
          {batchMut.isPending ? '…' : 'Calculate'}
        </button>
      </div>

      {result && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 11 }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Density </span>
              <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)' }}>
                {result.blend_density_g_ml.toFixed(4)} g/mL
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Total mass </span>
              <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)' }}>
                {result.total_mass_g.toFixed(2)} g
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {result.components.map(c => (
              <div key={c.substance_id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)', width: 80, textAlign: 'right' }}>
                  {c.mass_g.toFixed(2)} g
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-secondary)', width: 80, textAlign: 'right' }}>
                  {c.volume_ml != null ? `${c.volume_ml.toFixed(2)} mL` : '—'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GCxGC section — lazy-loaded heatmap
// ─────────────────────────────────────────────────────────────────────────────
function GCxGCSection({ composition }: { composition: Record<string, number> }) {
  const [show, setShow] = useState(false)
  const gcxgcMut    = useGCxGCTable()
  const subfamMut   = useGCxGCSubfamilyTotals()
  const [rows, setRows]     = useState<Record<string, number | string>[]>([])
  const [totals, setTotals] = useState<Record<string, number>>({})

  const handleLoad = () => {
    setShow(true)
    if (rows.length) return
    gcxgcMut.mutate(composition, {
      onSuccess: res => setRows(res.data.table),
    })
    subfamMut.mutate(composition, {
      onSuccess: res => setTotals(res.data.totals),
    })
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="section-label" style={{ margin: 0 }}>GCxGC Composition</span>
        {!show ? (
          <button
            onClick={handleLoad}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'inherit', padding: 0, transition: 'color 150ms' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Load heatmap
          </button>
        ) : (
          <button
            onClick={() => setShow(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'inherit', padding: 0 }}
          >
            Hide
          </button>
        )}
      </div>
      {show && gcxgcMut.isPending && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 48 }}>
          <div className="spinner" />
        </div>
      )}
      {show && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <GCxGCHeatmap rows={rows} height={280} />
          <FamilyCarbonProfileChart rows={rows} height={220} />
          {Object.keys(totals).length > 0 && <SubfamilyTable totals={totals} />}
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AutoFillTargets — Mode 1 (from DB substance) + Mode 2 (from GCxGC file)
// ─────────────────────────────────────────────────────────────────────────────
function AutoFillTargets() {
  const store          = useOptimizerStore()
  const { data: substances = [] } = usePoolSubstances()
  const substanceMut   = useSubstanceGCxGCTargets()
  const fileMut        = useParseGCxGCTargets()
  const fileRef        = useRef<HTMLInputElement>(null)

  const [pickedId, setPickedId]     = useState('')
  const [preview, setPreview]       = useState<GCxGCTargets | null>(null)
  const [error, setError]           = useState<string | null>(null)

  const applyTargets = (t: GCxGCTargets) => {
    const ft = t.family_totals
    const total = ft.npara + ft.isopara + ft.cyclopara + ft.arom || 1
    store.setTarget('target_n', Math.round((ft.npara   / total) * 100))
    store.setTarget('target_i', Math.round((ft.isopara / total) * 100))
    store.setTarget('target_c', Math.round((ft.cyclopara / total) * 100))
    store.setTarget('target_a', Math.round((ft.arom    / total) * 100))
    if (t.carbon_dist?.length === 20) store.setCarbonDist(t.carbon_dist)
    setPreview(null)
    setPickedId('')
  }

  const handleSubstanceFetch = () => {
    if (!pickedId) return
    setError(null)
    substanceMut.mutate(pickedId, {
      onSuccess: data => setPreview(data),
      onError:   ()   => setError('No GCxGC data found for this substance'),
    })
  }

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    fileMut.mutate(file, {
      onSuccess: data => setPreview(data),
      onError:   ()   => setError('Could not parse file — check format'),
    })
    e.target.value = ''
  }

  const ft   = preview?.family_totals
  const sum  = ft ? ft.npara + ft.isopara + ft.cyclopara + ft.arom : 0
  const pct  = (v: number) => sum ? `${Math.round((v / sum) * 100)}%` : '—'

  const isPending = substanceMut.isPending || fileMut.isPending

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 5, padding: '10px 12px', background: 'var(--bg-elevated)', fontSize: 11 }}>
      <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
        Auto-fill from
      </div>

      {/* Mode 1: from substance */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
        <select
          value={pickedId}
          onChange={e => { setPickedId(e.target.value); setPreview(null); setError(null) }}
          className="field"
          style={{ fontSize: 11, padding: '4px 7px', flex: 1 }}
        >
          <option value="">— select substance —</option>
          {substances.map(s => (
            <option key={s.substance_id} value={s.substance_id}>{s.nom}</option>
          ))}
        </select>
        <button
          onClick={handleSubstanceFetch}
          disabled={!pickedId || isPending}
          className="btn btn-secondary btn-xs"
          style={{ flexShrink: 0 }}
        >
          {substanceMut.isPending ? '…' : 'Load'}
        </button>
      </div>

      {/* Mode 2: from GCxGC file */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 10, flex: 1 }}>
          or upload a GCxGC .xlsx / .csv file
        </span>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isPending}
          className="btn btn-secondary btn-xs"
          style={{ flexShrink: 0 }}
        >
          {fileMut.isPending ? '…' : '↑ File'}
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={handleFilePick} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--danger)' }}>{error}</div>
      )}

      {/* Preview + Apply */}
      {preview && ft && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg-surface)', borderRadius: 4, border: '1px solid var(--border)' }}>
          {preview.substance_name && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ↳ {preview.substance_name}
              {preview.detected_families && ` — ${preview.detected_families.length} families`}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'n', val: ft.npara,     pct: pct(ft.npara),     color: '#4C9BE8' },
              { label: 'iso', val: ft.isopara,  pct: pct(ft.isopara),   color: '#52C893' },
              { label: 'cyclo', val: ft.cyclopara, pct: pct(ft.cyclopara), color: '#F5A742' },
              { label: 'arom', val: ft.arom,    pct: pct(ft.arom),      color: '#E8567A' },
            ].map(({ label, val, pct: p, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>{label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color, fontWeight: 600 }}>{p}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{val.toFixed(1)}%</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => applyTargets(preview)}
            className="btn btn-primary btn-xs"
            style={{ width: '100%' }}
          >
            Apply targets + carbon dist
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Export helpers
// ─────────────────────────────────────────────────────────────────────────────
function downloadBlob(content: string, filename: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function exportResultJSON(result: OptimizationResult, runName: string) {
  downloadBlob(
    JSON.stringify({ run: runName, result_name: result.result_name, composition: result.composition, properties: result.computed_properties }, null, 2),
    `${result.result_name.replace(/\s+/g, '_')}.json`,
    'application/json',
  )
}

function exportResultCSV(result: OptimizationResult) {
  const propRows = Object.entries(result.computed_properties)
    .map(([k, v]) => `${k},${v ?? ''}`)
    .join('\n')
  const compRows = Object.entries(result.composition)
    .map(([k, v]) => `${k},${(v * 100).toFixed(4)}`)
    .join('\n')
  const csv = `# Composition (%)\nsubstance_id,fraction_pct\n${compRows}\n\n# Properties\nproperty,value\n${propRows}`
  downloadBlob(csv, `${result.result_name.replace(/\s+/g, '_')}.csv`, 'text/csv')
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparison panel — cards + optional table view
// ─────────────────────────────────────────────────────────────────────────────
const FAMILY_COLORS_COMP = ['#4C9BE8', '#52C893', '#F5A742', '#E8567A']
const FAMILY_KEYS_COMP = [
  { key: 'n_paraffins_pct',  label: 'n-Par' },
  { key: 'isoparaffins_pct', label: 'iso' },
  { key: 'cyclopara_pct',    label: 'Cyclo' },
  { key: 'aromatics_pct',    label: 'Arom' },
] as const

const TABLE_ROWS_COMP: { key: string; label: string; unit: string; dec: number }[] = [
  { key: 'density_sv_g_ml',      label: 'Density (SV)',       unit: 'g/mL',    dec: 4 },
  { key: 'density_linear_g_ml',  label: 'Density (lin)',      unit: 'g/mL',    dec: 4 },
  { key: 'density_gcgc_g_ml',    label: 'Density (GCxGC)',    unit: 'g/mL',    dec: 4 },
  { key: 'fp_mi_degC',           label: 'Flash Point (MI)',   unit: '°C',      dec: 1 },
  { key: 'fp_linear_degC',       label: 'Flash Point (lin)',  unit: '°C',      dec: 1 },
  { key: 'kv_p40_zhmud',         label: 'KV +40°C (Zhmud)',  unit: 'mm²/s',   dec: 3 },
  { key: 'kv_p40_lechat',        label: 'KV +40°C (LeChat)', unit: 'mm²/s',   dec: 3 },
  { key: 'kv_p40_linear',        label: 'KV +40°C (lin)',    unit: 'mm²/s',   dec: 3 },
  { key: 'kv_m20_regression',    label: 'KV −20°C (reg)',    unit: 'mm²/s',   dec: 3 },
  { key: 'kv_m40_regression',    label: 'KV −40°C (reg)',    unit: 'mm²/s',   dec: 3 },
  { key: 'n_paraffins_pct',      label: 'n-Paraffins',       unit: '%',       dec: 2 },
  { key: 'isoparaffins_pct',     label: 'Isoparaffins',      unit: '%',       dec: 2 },
  { key: 'cyclopara_pct',        label: 'Cycloparaffins',    unit: '%',       dec: 2 },
  { key: 'aromatics_pct',        label: 'Aromatics',         unit: '%',       dec: 2 },
  { key: 'lhv_linear',           label: 'LHV',               unit: 'MJ/kg',   dec: 2 },
  { key: 'mw_linear',            label: 'MW',                unit: 'g/mol',   dec: 2 },
  { key: 'frzp_linear',          label: 'Freeze Point',      unit: '°C',      dec: 1 },
  { key: 'surft_25_rho_mn_m',    label: 'Surf. Tension @25', unit: 'mN/m',    dec: 2 },
  { key: 'cmass',                label: 'C mass',            unit: 'g/100g',  dec: 3 },
  { key: 'cn_linear',            label: 'Cetane Number',     unit: '—',       dec: 1 },
  { key: 'dist_ibp_linear',      label: 'Dist IBP',          unit: '°C',      dec: 1 },
  { key: 'dist_t10_linear',      label: 'Dist T10',          unit: '°C',      dec: 1 },
  { key: 'dist_t50_linear',      label: 'Dist T50',          unit: '°C',      dec: 1 },
  { key: 'dist_t90_linear',      label: 'Dist T90',          unit: '°C',      dec: 1 },
  { key: 'dist_fbp_linear',      label: 'Dist FBP',          unit: '°C',      dec: 1 },
]

type ComparisonViewMode = 'cards' | 'table'

function ComparisonPanel() {
  const { comparisonItems, removeFromComparison, clearComparison } = useOptimizerStore()
  const [viewMode, setViewMode] = useState<ComparisonViewMode>('cards')
  if (!comparisonItems.length) return null

  const fmt = (v: number | null | undefined, dec = 2) =>
    v == null ? '—' : v.toFixed(dec)

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 20px 6px',
      }}>
        <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, flex: 1 }}>
          Comparison ({comparisonItems.length})
        </span>

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          {(['cards', 'table'] as ComparisonViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                background: viewMode === mode ? 'var(--accent-muted)' : 'transparent',
                border: 'none',
                padding: '2px 10px',
                fontSize: 10,
                color: viewMode === mode ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        <button
          onClick={clearComparison}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit', padding: 0, transition: 'color 150ms' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          Clear all
        </button>
      </div>

      {/* Cards view */}
      {viewMode === 'cards' && (
        <div style={{
          display: 'flex', gap: 12, overflowX: 'auto',
          padding: '0 20px 16px',
          scrollbarWidth: 'thin',
        }}>
          {comparisonItems.map(({ result: r, label }) => (
            <div key={r.result_id} style={{
              flexShrink: 0, width: 220,
              border: '1px solid var(--border)', borderRadius: 6,
              background: 'var(--bg-base)', padding: 12,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.result_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label}
                  </div>
                </div>
                <button
                  onClick={() => removeFromComparison(r.result_id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: 0, lineHeight: 1, fontFamily: 'inherit', flexShrink: 0, transition: 'color 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >×</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
                <span style={{ color: r.converged ? 'var(--success)' : 'var(--danger)' }}>
                  {r.converged ? '✓ Converged' : '✗ Not converged'}
                </span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                  {r.objective_value.toExponential(2)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {FAMILY_KEYS_COMP.map(({ key, label: fl }, i) => {
                  const val = (r.computed_properties as unknown as Record<string, number | null>)[key] ?? 0
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', width: 28, flexShrink: 0 }}>{fl}</span>
                      <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: FAMILY_COLORS_COMP[i], width: `${(val as number).toFixed(1)}%`, transition: 'width 300ms' }} />
                      </div>
                      <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-secondary)', width: 32, textAlign: 'right' }}>
                        {(val as number).toFixed(1)}%
                      </span>
                    </div>
                  )
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {([
                  ['ρ (SV)',  r.computed_properties.density_sv_g_ml,   'g/mL'],
                  ['FP (MI)', r.computed_properties.fp_mi_degC,         '°C'],
                  ['KV+40',   r.computed_properties.kv_p40_zhmud,       'mm²/s'],
                  ['KV−20',   r.computed_properties.kv_m20_regression,  'mm²/s'],
                ] as [string, number | null, string][]).map(([lbl, val, unit]) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'center', fontSize: 10 }}>
                    <span style={{ color: 'var(--text-muted)', flex: 1 }}>{lbl}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)' }}>{fmt(val, 4)}</span>
                    <span style={{ color: 'var(--border-hi)', marginLeft: 4, width: 40, textAlign: 'right' }}>{unit}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table view */}
      {viewMode === 'table' && (
        <div style={{ overflowX: 'auto', padding: '0 20px 16px', maxHeight: 360 }}>
          <table style={{
            borderCollapse: 'collapse', fontSize: 11, width: '100%',
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                <th style={{
                  position: 'sticky', left: 0, zIndex: 1,
                  background: 'var(--bg-elevated)',
                  padding: '6px 10px', textAlign: 'left', fontWeight: 500,
                  color: 'var(--text-muted)', fontSize: 10,
                  borderBottom: '1px solid var(--border)',
                  minWidth: 140, whiteSpace: 'nowrap',
                }}>
                  Property
                </th>
                <th style={{ padding: '6px 8px', fontSize: 9, color: 'var(--border-hi)', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 400 }}>
                  Unit
                </th>
                {comparisonItems.map(({ result: r, label }) => (
                  <th key={r.result_id} style={{
                    padding: '6px 10px', textAlign: 'right', fontWeight: 500,
                    color: 'var(--text-primary)', fontSize: 10,
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap', minWidth: 100,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.result_name}</span>
                      <button
                        onClick={() => removeFromComparison(r.result_id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: 0, lineHeight: 1, fontFamily: 'inherit', flexShrink: 0, transition: 'color 150ms' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >×</button>
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS_COMP.map(({ key, label: rowLabel, unit, dec }, rowIdx) => {
                const vals = comparisonItems.map(
                  ({ result: r }) => (r.computed_properties as unknown as Record<string, number | null>)[key]
                )
                const hasAny = vals.some(v => v != null)
                if (!hasAny) return null
                const numericVals = vals.filter((v): v is number => v != null)
                const min = numericVals.length ? Math.min(...numericVals) : null
                const max = numericVals.length ? Math.max(...numericVals) : null
                return (
                  <tr key={key} style={{ background: rowIdx % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)' }}>
                    <td style={{
                      position: 'sticky', left: 0,
                      background: rowIdx % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)',
                      padding: '5px 10px', color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap', fontSize: 11,
                    }}>
                      {rowLabel}
                    </td>
                    <td style={{ padding: '5px 8px', color: 'var(--border-hi)', fontSize: 9, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {unit}
                    </td>
                    {vals.map((v, ci) => {
                      const isBest = v != null && min != null && max != null && Math.abs(max - min) > 1e-6 && v === max
                      return (
                        <td key={ci} style={{
                          padding: '5px 10px', textAlign: 'right', fontWeight: isBest ? 600 : 400,
                          color: v == null ? 'var(--border-hi)' : isBest ? 'var(--accent)' : 'var(--text-primary)',
                        }}>
                          {v == null ? '—' : v.toFixed(dec)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Reference fuel comparison table
// ─────────────────────────────────────────────────────────────────────────────
const REF_ROWS: { label: string; unit: string; blendKey: string; refKey: keyof SubstanceProps }[] = [
  { label: 'Density',              unit: 'g/mL',    blendKey: 'density_sv_g_ml',    refKey: 'density'  },
  { label: 'Flash Point',          unit: '°C',      blendKey: 'fp_mi_degC',          refKey: 'fp'       },
  { label: 'KV +40°C',            unit: 'mm²/s',   blendKey: 'kv_p40_zhmud',        refKey: 'kv_p40'   },
  { label: 'KV −20°C',            unit: 'mm²/s',   blendKey: 'kv_m20_regression',   refKey: 'kv_m20'   },
  { label: 'KV −40°C',            unit: 'mm²/s',   blendKey: 'kv_m40_regression',   refKey: 'kv_m40'   },
  { label: 'MW',                   unit: 'g/mol',   blendKey: 'mw_linear',           refKey: 'mw'       },
  { label: 'LHV',                  unit: 'MJ/kg',   blendKey: 'lhv_linear',          refKey: 'lhv'      },
  { label: 'Freeze Pt',            unit: '°C',      blendKey: 'frzp_linear',         refKey: 'frzp'     },
  { label: 'Surface Tension 20°C', unit: 'mN/m',    blendKey: 'surft_20_linear',     refKey: 'surft_20' },
  { label: 'Cp 20°C',             unit: 'kJ/kg·K', blendKey: 'cp_20_linear',        refKey: 'cp_20'    },
  { label: 'Dist T50',             unit: '°C',      blendKey: 'dist_t50_linear',     refKey: 'dist_t50' },
]

function fmtN(v: number | null | undefined): string {
  if (v == null) return '—'
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 1 })
  if (Math.abs(v) >= 10)   return v.toFixed(2)
  return v.toFixed(4)
}

function ReferenceComparisonTable({
  computed, refProps,
}: {
  computed: import('@/types').ComputedProperties
  refProps: SubstanceProps
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, padding: '4px 8px 4px 0', fontSize: 11 }}>Property</th>
          <th style={{ textAlign: 'right', color: 'var(--text-muted)', fontWeight: 500, padding: '4px 8px', fontSize: 11 }}>Blend</th>
          <th style={{ textAlign: 'right', color: 'var(--text-muted)', fontWeight: 500, padding: '4px 0 4px 8px', fontSize: 11 }}>Reference</th>
        </tr>
      </thead>
      <tbody>
        {REF_ROWS.map(({ label, unit, blendKey, refKey }) => {
          const blendVal  = (computed as unknown as Record<string, number | null>)[blendKey]
          const refVal    = refProps[refKey] as number | null
          let blendColor: string = 'var(--text-primary)'
          if (blendVal != null && refVal != null && refVal !== 0) {
            const delta = Math.abs((blendVal - refVal) / refVal)
            blendColor = delta <= 0.05 ? 'var(--success)' : delta <= 0.15 ? 'var(--warning)' : 'var(--danger)'
          }
          return (
            <tr key={blendKey} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: '5px 8px 5px 0', color: 'var(--text-secondary)' }}>
                {label} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({unit})</span>
              </td>
              <td style={{ textAlign: 'right', padding: '5px 8px', fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: blendColor }}>
                {fmtN(blendVal)}
              </td>
              <td style={{ textAlign: 'right', padding: '5px 0 5px 8px', fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-secondary)' }}>
                {fmtN(refVal)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Results panel
// ─────────────────────────────────────────────────────────────────────────────
function ResultsPanel({
  result, runName, onClear, onSave, onSelectResult, otherResults = [], nameMap = {},
}: {
  result: OptimizationResult
  runName?: string
  onClear: () => void
  onSave: () => void
  onSelectResult: (r: OptimizationResult) => void
  otherResults?: OptimizationResult[]
  nameMap?: Record<string, string>
}) {
  const { comparisonItems, targetFuelId } = useOptimizerStore()
  const alreadySaved = comparisonItems.some(c => c.result.result_id === result.result_id)
  const [showOthers, setShowOthers] = useState(false)
  const { data: refProps } = useSubstanceProps(targetFuelId)

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {runName ? `${runName} — ` : ''}{result.result_name}
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>Objective: {result.objective_value.toExponential(3)}</span>
            {result.converged
              ? <span style={{ color: 'var(--success)' }}>✓ Converged</span>
              : <span style={{ color: 'var(--danger)' }}>✗ Not converged</span>
            }
            {result.sparsity_desc && (
              <span style={{ color: 'var(--warning)' }}>{result.sparsity_desc}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => exportResultJSON(result, runName ?? '')}
            title="Download JSON"
            style={{ padding: '4px 8px', fontSize: 11, borderRadius: 4, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', transition: 'all 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >JSON</button>
          <button
            onClick={() => exportResultCSV(result)}
            title="Download CSV"
            style={{ padding: '4px 8px', fontSize: 11, borderRadius: 4, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', transition: 'all 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >CSV</button>
          <button
            onClick={onSave}
            disabled={alreadySaved}
            title={alreadySaved ? 'Already saved to comparison' : 'Save to comparison'}
            style={{
              padding: '4px 10px', fontSize: 11, borderRadius: 4, fontFamily: 'inherit',
              cursor: alreadySaved ? 'default' : 'pointer',
              border: '1px solid var(--border)',
              background: alreadySaved ? 'var(--accent-muted)' : 'none',
              color: alreadySaved ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { if (!alreadySaved) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}}
            onMouseLeave={e => { if (!alreadySaved) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}}
          >
            {alreadySaved ? '★ Saved' : '☆ Compare'}
          </button>
          <button
            onClick={onClear}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-muted)', padding: 0, lineHeight: 1, fontFamily: 'inherit' }}
          >×</button>
        </div>
      </div>

      <section>
        <span className="section-label">Blend Composition</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(result.composition)
            .sort(([, a], [, b]) => b - a)
            .map(([sid, frac]) => (
              <div key={sid} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{ fontSize: 12, color: 'var(--text-secondary)', width: 208, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
                  title={sid}
                >
                  {nameMap[sid] ?? sid.replace(/^s_/, '')}
                </span>
                <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{ height: '100%', background: 'var(--accent)', borderRadius: 4, transition: 'width 300ms', width: `${(frac * 100).toFixed(1)}%` }}
                  />
                </div>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)', width: 56, textAlign: 'right' }}>
                  {(frac * 100).toFixed(1)}%
                </span>
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
        <span className="section-label">Computed Properties</span>
        <PropertyTable props={result.computed_properties} />
      </section>

      {refProps && (
        <section>
          <span className="section-label">
            vs. Reference — {refProps.name}
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8, fontWeight: 400 }}>
              green ≤5% · orange ≤15% · red &gt;15%
            </span>
          </span>
          <ReferenceComparisonTable computed={result.computed_properties} refProps={refProps} />
        </section>
      )}

      <GCxGCSection composition={result.composition} />

      <section>
        <BatchQuantitiesPanel composition={result.composition} />
      </section>

      {otherResults.length > 0 && (
        <section>
          <button
            onClick={() => setShowOthers(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span className="section-label" style={{ margin: 0 }}>All Solutions</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {otherResults.length + 1} restarts {showOthers ? '▴' : '▾'}
            </span>
          </button>
          {showOthers && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[result, ...otherResults].map((r, i) => (
                <div
                  key={r.result_id}
                  onClick={() => { if (r.result_id !== result.result_id) onSelectResult(r) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 12px', borderRadius: 4,
                    border: `1px solid ${r.result_id === result.result_id ? 'var(--accent)' : 'var(--border)'}`,
                    background: r.result_id === result.result_id ? 'var(--accent-muted)' : 'var(--bg-surface)',
                    cursor: r.result_id === result.result_id ? 'default' : 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-muted)', width: 20 }}>
                    #{i + 1}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{r.result_name}</span>
                  <span style={{ fontSize: 10, color: r.converged ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }}>
                    {r.converged ? '✓' : '✗'}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-muted)', width: 80, textAlign: 'right' }}>
                    {r.objective_value.toExponential(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-run button
// ─────────────────────────────────────────────────────────────────────────────
function ReRunButton({ runId }: { runId: string }) {
  const [enabled, setEnabled] = useState(false)
  const { data: config, isFetching } = useRunConfig(enabled ? runId : null)
  const runMut = useRunOptimizer()
  const [fired, setFired] = useState(false)

  useEffect(() => {
    if (config && enabled && !fired) {
      setFired(true)
      setEnabled(false)
      runMut.mutate({ ...(config as Record<string, unknown>), n_restarts: 4 })
    }
  }, [config, enabled, fired, runMut])

  return (
    <button
      onClick={() => { setFired(false); setEnabled(true) }}
      disabled={isFetching || runMut.isPending}
      title="Re-submit this run config as a new run"
      style={{
        padding: '4px 8px', fontSize: 10, color: 'var(--text-secondary)',
        border: '1px solid var(--border)', borderRadius: 4, background: 'none',
        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        transition: 'all 150ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
      {isFetching || runMut.isPending ? '…' : '↺'}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Run history entry
// ─────────────────────────────────────────────────────────────────────────────
function RunHistoryEntry({
  run, onLoad, onDelete,
}: {
  run: OptimizationRun
  onLoad: (result: OptimizationResult, name: string) => void
  onDelete: (id: string) => void
}) {
  const [enabled, setEnabled] = useState(false)
  const { data: fullRun, isFetching } = useRun(enabled ? run.run_id : null)
  const { isAdmin } = useAuth()

  const handleLoad = () => {
    if (fullRun?.results?.[0]) { onLoad(fullRun.results[0], fullRun.run_name); return }
    setEnabled(true)
  }

  useEffect(() => {
    if (fullRun?.results?.[0] && enabled) {
      onLoad(fullRun.results[0], fullRun.run_name)
      setEnabled(false)
    }
  }, [fullRun, enabled, onLoad])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 4,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{run.run_name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{new Date(run.created_at).toLocaleString()}</span>
          {run.scenario && (
            <span style={{ color: 'var(--accent)', background: 'var(--accent-muted)', padding: '2px 6px', borderRadius: 3, fontSize: 10 }}>
              {run.scenario}
            </span>
          )}
        </div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
        {run.n_results} result{run.n_results !== 1 ? 's' : ''}
      </span>
      <button
        onClick={handleLoad}
        disabled={isFetching}
        className="btn btn-secondary btn-xs"
      >
        {isFetching ? '…' : 'Load'}
      </button>
      <ReRunButton runId={run.run_id} />
      {isAdmin && (
        <button
          onClick={() => onDelete(run.run_id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', padding: '0 4px', transition: 'color 150ms', lineHeight: 1, fontFamily: 'inherit', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >×</button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function Tab1Predefined() {
  const store      = useOptimizerStore()
  const runMut     = useRunOptimizer()
  const deleteMut  = useDeleteRun()
  const diagnoseMut = useDiagnoseConstraints()
  const { data: runs = [] } = useRuns()
  const { data: substances = [] } = usePoolSubstances()
  const nameMap = Object.fromEntries(substances.map(s => [s.substance_id, s.nom]))

  const [cfgOpen, setCfgOpen]           = useState(true)
  const [result, setResult]             = useState<OptimizationResult | null>(null)
  const [allResults, setAllResults]     = useState<OptimizationResult[]>([])
  const [resultRunName, setRunName]     = useState<string>('')
  const [errors, setErrors]             = useState<string[]>([])
  const [showHistory, setShowHistory]   = useState(false)
  const [diagnoseResult, setDiagnoseResult] = useState<DiagnoseResult | null>(null)

  const handleDiagnose = () => {
    setDiagnoseResult(null)
    const payload: Record<string, unknown> = {
      substance_ids:       store.selectedIds,
      availability_limits: store.availabilityLimits,
      family_constraints:  store.familyConstraints,
    }
    diagnoseMut.mutate(payload, {
      onSuccess: data => setDiagnoseResult(data),
    })
  }

  const handleRun = () => {
    if (!store.selectedIds.length) return
    setErrors([])
    setShowHistory(false)

    const payload: Record<string, unknown> = {
      substance_ids:       store.selectedIds,
      targets:             store.targets,
      scenario:            store.scenario,
      n_restarts:          store.nRestarts,
      fp_basis:            store.fpBasis,
      carbon_dist:         store.carbonDist,
      family_constraints:  store.familyConstraints,
      component_caps:      store.componentCaps,
      availability_limits: store.availabilityLimits,
    }
    if (store.sparsity)                     payload.sparsity   = store.sparsity
    if (Object.keys(store.pfTargets).length) payload.pf_targets = store.pfTargets

    runMut.mutate(payload, {
      onSuccess: res => {
        const data = res.data
        if (data.errors?.length) { setErrors(data.errors); return }
        const r = data.results?.[0]
        if (r) {
          setResult(r)
          setAllResults(data.results ?? [])
          setRunName(store.scenario)
          store.setLastRunComposition(r.composition)
        }
        store.setActiveRunId(data.run_id)
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message
        setErrors([msg ?? 'Run failed — check constraints and pool selection'])
      },
    })
  }

  const smallSelectStyle: React.CSSProperties = {
    fontSize: 12, padding: '5px 8px',
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Left — configuration (collapsible) ──────────────────────────── */}
      <CollapsiblePanel open={cfgOpen} onToggle={() => setCfgOpen(v => !v)} width={340}>
      <div style={{
        display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1,
      }}>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Scenario */}
          <section>
            <label className="section-label">Scenario</label>
            <select
              value={store.scenario}
              onChange={e => store.setScenario(e.target.value as Scenario)}
              className="field"
            >
              {SCENARIOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {SCENARIO_DESCRIPTIONS[store.scenario] && (
              <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
                {SCENARIO_DESCRIPTIONS[store.scenario]}
              </p>
            )}
          </section>

          {/* Family targets */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="section-label" style={{ margin: 0 }}>Family Targets (%)</label>
              <SumIndicator sum={store.targets.target_n + store.targets.target_i + store.targets.target_c + store.targets.target_a} />
            </div>
            <AutoFillTargets />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {([
                ['target_n', 'n-Paraffins'],
                ['target_i', 'Isoparaffins'],
                ['target_c', 'Cycloparaffins'],
                ['target_a', 'Aromatics'],
              ] as const).map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 96 }}>{label}</span>
                  <input
                    type="range" min={0} max={100} step={1}
                    value={store.targets[key]}
                    onChange={e => store.setTarget(key, Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent)' }}
                  />
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)', width: 32, textAlign: 'right' }}>
                    {store.targets[key]}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 96 }}>C mass</span>
                <input
                  type="number" min={0} max={100} step={0.1}
                  value={store.targets.cmass_target}
                  onChange={e => store.setTarget('cmass_target', Number(e.target.value))}
                  className="field"
                  style={{ flex: 1, ...smallSelectStyle }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 32 }}>g/100g</span>
              </div>
            </div>
          </section>

          {/* Family constraints */}
          <section>
            <label className="section-label">Family Constraints</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FAMILY_KEYS.map(fam => {
                const c = store.familyConstraints[fam] ?? { mode: 'off', lo: 0, hi: 100 }
                return (
                  <div key={fam} style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{FAMILY_LABELS[fam]}</span>
                      <select
                        value={c.mode}
                        onChange={e => store.setFamilyConstraint(fam, {
                          ...c, mode: e.target.value as 'off' | 'range' | 'fixed',
                        })}
                        className="field"
                        style={{ fontSize: 10, padding: '2px 6px' }}
                      >
                        <option value="off">off</option>
                        <option value="range">range</option>
                        <option value="fixed">fixed</option>
                      </select>
                    </div>
                    {c.mode !== 'off' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(['lo', 'hi'] as const)
                          .filter(k => c.mode === 'range' || k === 'lo')
                          .map(k => (
                            <div key={k} style={{ flex: 1 }}>
                              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                                {k === 'lo' ? (c.mode === 'fixed' ? 'value' : 'min') : 'max'}
                              </div>
                              <input
                                type="number" min={0} max={100} step={1}
                                value={c[k]}
                                onChange={e => store.setFamilyConstraint(fam, {
                                  ...c, [k]: Number(e.target.value),
                                })}
                                className="field"
                                style={{ width: '100%', fontSize: 11, padding: '4px 6px' }}
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

          {/* Sparsity */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="section-label" style={{ margin: 0 }}>Sparsity Control</label>
              <input
                type="checkbox"
                checked={!!store.sparsity}
                onChange={e => store.setSparsity(
                  e.target.checked
                    ? { mode: 'threshold', threshold_pct: 2, n_components: 5 }
                    : null
                )}
                style={{ accentColor: 'var(--accent)' }}
              />
            </div>
            {store.sparsity && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select
                  value={store.sparsity.mode}
                  onChange={e => store.setSparsity({
                    ...store.sparsity!,
                    mode: e.target.value as 'threshold' | 'fixed_n' | 'minimise_n',
                  })}
                  className="field"
                >
                  <option value="threshold">Threshold %</option>
                  <option value="fixed_n">Fixed N components</option>
                  <option value="minimise_n">Minimise N</option>
                </select>
                {store.sparsity.mode !== 'fixed_n' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Threshold</span>
                    <input
                      type="number" min={0.1} max={20} step={0.1}
                      value={store.sparsity.threshold_pct}
                      onChange={e => store.setSparsity({ ...store.sparsity!, threshold_pct: Number(e.target.value) })}
                      className="field"
                      style={{ width: 80, ...smallSelectStyle }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>%</span>
                  </div>
                )}
                {store.sparsity.mode === 'fixed_n' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>N components</span>
                    <input
                      type="number" min={1} max={20} step={1}
                      value={store.sparsity.n_components}
                      onChange={e => store.setSparsity({ ...store.sparsity!, n_components: Number(e.target.value) })}
                      className="field"
                      style={{ width: 80, ...smallSelectStyle }}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Settings */}
          <section>
            <label className="section-label">Settings</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 96 }}>FP basis</span>
                <select
                  value={store.fpBasis}
                  onChange={e => store.setFpBasis(e.target.value as 'mole' | 'mass')}
                  className="field"
                  style={{ flex: 1, ...smallSelectStyle }}
                >
                  <option value="mole">Mole</option>
                  <option value="mass">Mass</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 96 }}>Restarts</span>
                <input
                  type="number" min={1} max={50}
                  value={store.nRestarts}
                  onChange={e => store.setNRestarts(Number(e.target.value))}
                  className="field"
                  style={{ width: 80, ...smallSelectStyle }}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Run button */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {errors.length > 0 && (
            <div style={{
              marginBottom: 10,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 4, fontSize: 11,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
                <span style={{ color: 'var(--danger)', flex: 1 }}>{errors[0]}</span>
                <button
                  onClick={handleDiagnose}
                  disabled={diagnoseMut.isPending || !store.selectedIds.length}
                  style={{
                    flexShrink: 0, padding: '3px 8px', fontSize: 10, borderRadius: 3,
                    border: '1px solid rgba(239,68,68,0.4)', background: 'none',
                    color: 'var(--danger)', cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  {diagnoseMut.isPending ? '…' : 'Diagnose'}
                </button>
              </div>

              {/* Diagnose results */}
              {diagnoseResult && (
                <div style={{ borderTop: '1px solid rgba(239,68,68,0.2)', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>
                    Constraint diagnostics
                  </div>

                  {/* LP verdict */}
                  <div style={{
                    fontSize: 10, padding: '4px 8px', borderRadius: 3,
                    background: diagnoseResult.feasible ? 'rgba(52,199,89,0.1)' : 'rgba(239,68,68,0.1)',
                    color: diagnoseResult.feasible ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${diagnoseResult.feasible ? 'rgba(52,199,89,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}>
                    LP pre-check: {diagnoseResult.feasible ? 'feasible' : 'infeasible'}
                    {!diagnoseResult.feasible && ' — NLP will not converge'}
                    {diagnoseResult.feasible && ' — infeasibility is in property constraints or NLP solver'}
                  </div>

                  {/* Issues list */}
                  {diagnoseResult.issues.map((issue, i) => (
                    <div key={i} style={{
                      fontSize: 10, padding: '4px 8px', borderRadius: 3,
                      background: issue.severity === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(245,167,66,0.08)',
                      color: issue.severity === 'error' ? 'var(--danger)' : 'var(--warning)',
                      border: `1px solid ${issue.severity === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(245,167,66,0.25)'}`,
                    }}>
                      <span style={{ opacity: 0.7 }}>{issue.severity === 'error' ? '✗' : '⚠'}</span>{' '}
                      {issue.message}
                    </div>
                  ))}

                  {/* Family ranges */}
                  {diagnoseResult.family_ranges && Object.keys(diagnoseResult.family_ranges).length > 0 && (
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                        Pool family ranges
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px 8px' }}>
                        {Object.entries(diagnoseResult.family_ranges).map(([fam, { pool_min, pool_max }]) => (
                          <div key={fam} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                            <span style={{ color: 'var(--text-muted)', width: 42 }}>
                              {fam === 'npara' ? 'n-Par' : fam === 'isopara' ? 'iso' : fam === 'cyclo' ? 'cyclo' : 'arom'}
                            </span>
                            <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-secondary)' }}>
                              {pool_min.toFixed(1)}–{pool_max.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {diagnoseResult.issues.length === 0 && diagnoseResult.feasible && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      No structural issues found. The problem is likely in the NLP solver — try increasing restarts or relaxing property constraints.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleRun}
            disabled={!store.selectedIds.length || runMut.isPending}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {runMut.isPending ? 'Optimizing…' : '▶  Run Optimizer'}
          </button>
          {!store.selectedIds.length && (
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0 0' }}>
              Select substances from the pool first
            </p>
          )}
        </div>
      </div>
      </CollapsiblePanel>

      {/* ── Right — results + comparison ─────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* scrollable content area */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {runMut.isPending && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Optimizing blend…</span>
              </div>
            </div>
          )}

          {result && !runMut.isPending && (
            <ResultsPanel
              result={result}
              runName={resultRunName}
              onClear={() => { setResult(null); setRunName('') }}
              onSave={() => store.addToComparison({ result, label: resultRunName })}
              onSelectResult={r => { setResult(r); store.setLastRunComposition(r.composition) }}
              otherResults={allResults.filter(r => r.result_id !== result.result_id)}
              nameMap={nameMap}
            />
          )}

          {!result && !runMut.isPending && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, opacity: 0.08, marginBottom: 12, userSelect: 'none', color: 'var(--accent)' }}>◎</div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
                    Configure and run to see results
                  </p>
                  <button
                    onClick={() => setShowHistory(v => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit', transition: 'color 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    {showHistory ? '▴ Hide' : '▾ Show'} run history ({runs.length})
                  </button>
                </div>
              </div>

              {showHistory && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 24px', maxHeight: '50vh', overflowY: 'auto' }}>
                  <span className="section-label">Run History</span>
                  {runs.length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No runs yet.</p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {runs.map(run => (
                      <RunHistoryEntry
                        key={run.run_id}
                        run={run}
                        onLoad={(r, name) => {
                          setResult(r)
                          setRunName(name)
                          setShowHistory(false)
                        }}
                        onDelete={id => deleteMut.mutate(id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* comparison panel — pinned to bottom, only visible when items saved */}
        <ComparisonPanel />
      </div>
    </div>
  )
}
