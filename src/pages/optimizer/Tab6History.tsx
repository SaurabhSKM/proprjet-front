// src/pages/optimizer/Tab6History.tsx
import { useState } from 'react'
import { useRuns, useRun, useDeleteRun } from '@/api/optimizer'
import { usePoolSubstances } from '@/api/optimizer'
import { useOptimizerStore } from '@/store/optimizerStore'
import { useAuth } from '@/app/auth/services/useAuth'
import { SkeletonRows, EmptyState } from '@/components/ui/primitives'
import { FuelSpecChecker } from '@/components/ui/FuelSpecChecker'
import { PropertyTable } from '@/components/tables/PropertyTable'
import type { OptimizationRun, OptimizationResult, ComputedProperties } from '@/types'

const PROP_ROWS: { key: keyof ComputedProperties; label: string; unit: string; decimals: number }[] = [
  { key: 'density_sv_g_ml',   label: 'Density (SV)',       unit: 'g/mL',    decimals: 4 },
  { key: 'density_linear_g_ml', label: 'Density (linear)', unit: 'g/mL',    decimals: 4 },
  { key: 'fp_mi_degC',        label: 'Flash Point (MI)',   unit: '°C',      decimals: 1 },
  { key: 'fp_linear_degC',    label: 'Flash Point (lin)',  unit: '°C',      decimals: 1 },
  { key: 'kv_p40_zhmud',      label: 'KV +40 °C (Zhmud)', unit: 'mm²/s',   decimals: 3 },
  { key: 'kv_p40_linear',     label: 'KV +40 °C (lin)',   unit: 'mm²/s',   decimals: 3 },
  { key: 'kv_m20_regression', label: 'KV −20 °C (reg)',   unit: 'mm²/s',   decimals: 3 },
  { key: 'kv_m40_regression', label: 'KV −40 °C (reg)',   unit: 'mm²/s',   decimals: 3 },
  { key: 'lhv_linear',        label: 'LHV (linear)',       unit: 'MJ/kg',   decimals: 2 },
  { key: 'cmass',             label: 'C mass fraction',    unit: 'g/g',     decimals: 4 },
  { key: 'n_paraffins_pct',   label: 'n-Paraffins',        unit: 'wt%',     decimals: 2 },
  { key: 'isoparaffins_pct',  label: 'Isoparaffins',       unit: 'wt%',     decimals: 2 },
  { key: 'cyclopara_pct',     label: 'Cycloparaffins',     unit: 'wt%',     decimals: 2 },
  { key: 'aromatics_pct',     label: 'Aromatics',          unit: 'wt%',     decimals: 2 },
  { key: 'frzp_linear',       label: 'Freeze Point (lin)', unit: '°C',      decimals: 1 },
  { key: 'surft_25_rho_mn_m', label: 'Surface Tension @25', unit: 'mN/m',  decimals: 2 },
  { key: 'mw_linear',         label: 'MW (linear)',        unit: 'g/mol',   decimals: 2 },
]

function fmt(val: number | null, decimals: number): string {
  if (val == null) return '—'
  return val.toFixed(decimals)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function RunRow({
  run,
  active,
  onClick,
}: {
  run: OptimizationRun
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: active ? 'var(--bg-elevated)' : 'transparent',
        border: 'none',
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
        borderRadius: '0 4px 4px 0',
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'background 120ms, border-color 120ms',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-surface)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{
        fontSize: 13,
        fontWeight: 500,
        color: active ? 'var(--accent)' : 'var(--text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        marginBottom: 3,
      }}>
        {run.run_name || run.run_id.slice(0, 12)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
        <span>{fmtDate(run.created_at)}</span>
        {run.scenario && <span>· {run.scenario}</span>}
        <span style={{ marginLeft: 'auto' }}>
          {run.n_results ?? 0}✓
        </span>
      </div>
    </button>
  )
}

function ResultDetail({
  result,
  substanceNameMap,
}: {
  result: OptimizationResult
  substanceNameMap: Record<string, string>
}) {
  const [showAllModels, setShowAllModels] = useState(false)
  const sorted = Object.entries(result.composition)
    .filter(([, f]) => f > 0.0001)
    .sort(([, a], [, b]) => b - a)

  return (
    <div style={{ display: 'flex', gap: 28 }}>
      {/* Composition */}
      <div style={{ flex: '0 0 260px' }}>
        <div className="section-label" style={{ marginBottom: 10 }}>Composition</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sorted.map(([sid, frac]) => (
            <div key={sid} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 13,
                color: 'var(--text-primary)',
              }}>
                {substanceNameMap[sid] ?? sid}
              </div>
              <div style={{
                width: 80,
                height: 4,
                background: 'var(--border)',
                borderRadius: 2,
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                <div style={{
                  height: '100%',
                  width: `${(frac * 100).toFixed(1)}%`,
                  background: 'var(--accent)',
                  borderRadius: 2,
                }} />
              </div>
              <span style={{
                fontSize: 12,
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                color: 'var(--text-secondary)',
                width: 52,
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {(frac * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        {result.sparsity_desc && (
          <div style={{
            marginTop: 10,
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          }}>
            {result.sparsity_desc}
          </div>
        )}

        <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            obj: {result.objective_value.toFixed(4)}
          </span>
          {result.converged
            ? <span className="badge badge-success">converged</span>
            : <span className="badge badge-warn">not converged</span>
          }
        </div>
      </div>

      {/* Properties */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="section-label" style={{ margin: 0 }}>Computed Properties</div>
          <button
            onClick={() => setShowAllModels(v => !v)}
            style={{
              background: showAllModels ? 'var(--accent-muted)' : 'none',
              border: `1px solid ${showAllModels ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 10,
              color: showAllModels ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 150ms',
            }}
          >
            {showAllModels ? 'Compact' : 'All models'}
          </button>
        </div>
        {showAllModels ? (
          <PropertyTable props={result.computed_properties} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '2px 16px',
          }}>
            {PROP_ROWS.map(({ key, label, unit, decimals }) => {
              const val = result.computed_properties[key] as number | null
              if (val == null) return null
              return (
                <div key={key} className="data-row" style={{ padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>{label}</span>
                  <span style={{
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    color: 'var(--text-primary)',
                  }}>
                    {fmt(val, decimals)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 44, textAlign: 'right' }}>
                    {unit}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Tab6History() {
  const [selectedRunId, setSelectedRunId]     = useState<string | null>(null)
  const [selectedResultIdx, setSelectedResultIdx] = useState(0)
  const [search, setSearch]                   = useState('')

  const store      = useOptimizerStore()
  const deleteRun  = useDeleteRun()
  const { isAdmin } = useAuth()

  const { data: runs = [], isLoading: runsLoading }           = useRuns(undefined, 100)
  const { data: runDetail, isLoading: detailLoading }         = useRun(selectedRunId)
  const { data: allSubstances = [] }                          = usePoolSubstances()

  const substanceNameMap = Object.fromEntries(allSubstances.map(s => [s.substance_id, s.nom]))

  const filteredRuns = runs.filter(r =>
    !search ||
    r.run_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.scenario ?? '').toLowerCase().includes(search.toLowerCase()) ||
    r.run_id.includes(search)
  )

  const results: OptimizationResult[] = runDetail?.results ?? []
  const activeResult = results[selectedResultIdx] ?? null

  function handleLoadPool() {
    if (!runDetail) return
    store.setSelectedIds(runDetail.pool_substance_ids)
    store.setActiveTab(0)
  }

  async function handleDelete() {
    if (!selectedRunId) return
    await deleteRun.mutateAsync(selectedRunId)
    setSelectedRunId(null)
    setSelectedResultIdx(0)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left: run list ──────────────────────────────────────────────── */}
      <div style={{
        width: 260,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
      }}>
        {/* Search */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter runs…"
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: 13,
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text-primary)',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Count */}
        <div style={{ padding: '6px 14px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
          {filteredRuns.length} run{filteredRuns.length !== 1 ? 's' : ''}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {runsLoading && <SkeletonRows rows={8} height={52} />}
          {!runsLoading && filteredRuns.length === 0 && (
            <div style={{ padding: '20px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
              No runs found.
            </div>
          )}
          {filteredRuns.map(run => (
            <RunRow
              key={run.run_id}
              run={run}
              active={run.run_id === selectedRunId}
              onClick={() => { setSelectedRunId(run.run_id); setSelectedResultIdx(0) }}
            />
          ))}
        </div>
      </div>

      {/* ── Right: run detail ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedRunId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EmptyState
              icon="◷"
              title="Select a run"
              description="Pick a past optimization run from the list to view its results."
            />
          </div>
        ) : detailLoading ? (
          <div style={{ padding: 28 }}>
            <SkeletonRows rows={6} height={40} />
          </div>
        ) : runDetail ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: "'DM Serif Display', Georgia, serif",
                }}>
                  {runDetail.run_name || runDetail.run_id}
                </h2>
                <div style={{ marginTop: 6, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(runDetail.created_at)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>by {runDetail.created_by}</span>
                  {runDetail.scenario && (
                    <span className="badge badge-info">{runDetail.scenario}</span>
                  )}
                  <span className="badge badge-neutral">{runDetail.run_type}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    pool: {runDetail.pool_substance_ids.length} substances
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleLoadPool}
                  title="Load the pool substances into the optimizer sidebar"
                >
                  Load Pool
                </button>
                {isAdmin && (
                  <button
                    className="btn btn-sm"
                    onClick={handleDelete}
                    disabled={deleteRun.isPending}
                    style={{
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      background: 'transparent',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = '#e05252'
                      e.currentTarget.style.borderColor = '#e05252'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--text-muted)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  >
                    {deleteRun.isPending ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            {results.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0' }}>
                No results stored for this run.
              </div>
            ) : (
              <>
                {/* Result selector (if multiple) */}
                {results.length > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 20,
                    padding: '10px 14px',
                    background: 'var(--bg-surface)',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Result
                    </span>
                    <button
                      className="btn btn-icon btn-sm"
                      onClick={() => setSelectedResultIdx(i => Math.max(0, i - 1))}
                      disabled={selectedResultIdx === 0}
                    >
                      ←
                    </button>
                    <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, ui-monospace, monospace', minWidth: 60, textAlign: 'center' }}>
                      {selectedResultIdx + 1} / {results.length}
                    </span>
                    <button
                      className="btn btn-icon btn-sm"
                      onClick={() => setSelectedResultIdx(i => Math.min(results.length - 1, i + 1))}
                      disabled={selectedResultIdx === results.length - 1}
                    >
                      →
                    </button>
                    <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                      {results[selectedResultIdx]?.result_name}
                    </span>
                  </div>
                )}

                {activeResult && (
                  <>
                    <ResultDetail
                      result={activeResult}
                      substanceNameMap={substanceNameMap}
                    />
                    <div style={{ marginTop: 24 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                        Fuel Spec Compliance
                      </div>
                      <FuelSpecChecker props={activeResult.computed_properties} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
