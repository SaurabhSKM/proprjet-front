// src/pages/optimizer/PoolSidebar.tsx
import { useRef, useState, useEffect } from 'react'
import { usePoolSubstances, usePool } from '@/api/optimizer'
import { useOptimizerStore } from '@/store/optimizerStore'
import type { PoolSubstance, DataCompleteness } from '@/types'
import type { CapLimit } from '@/store/optimizerStore'

const FIELD_LABELS: Record<string, string> = {
  has_density:  'Density',
  has_fp:       'Flash Point',
  has_mw:       'Molecular Weight',
  has_kv_p40:   'Viscosity @40°C',
  has_kv_m20:   'Viscosity @-20°C',
  has_kv_m40:   'Viscosity @-40°C',
  has_gcxgc:    'GCxGC',
  has_lhv:      'LHV',
  has_frzp:     'Freezing Point',
  has_surft:    'Surface Tension',
  has_cp:       'Heat Capacity',
  has_dist:     'Distillation',
  has_eos:      'EOS (Tc, Pc, ω)',
}

function CompletenessBar({ dc, onShowMissing, missingOpen }: {
  dc: DataCompleteness; onShowMissing: () => void; missingOpen: boolean
}) {
  const checks = [dc.has_density, dc.has_fp, dc.has_mw, dc.has_kv_p40, dc.has_kv_m20, dc.has_kv_m40, dc.has_gcxgc, dc.has_lhv, dc.has_frzp, dc.has_eos]
  const score  = checks.filter(Boolean).length
  const pct    = Math.round((score / checks.length) * 100)
  const color  = pct === 100 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 2, background: color, width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color, minWidth: 26, textAlign: 'right' }}>{pct}%</span>
      {dc.missing_fields.length > 0 && (
        <button
          onClick={e => { e.stopPropagation(); onShowMissing() }}
          style={{
            background: missingOpen ? 'rgba(245,158,11,0.15)' : 'none',
            border: `1px solid ${missingOpen ? 'rgba(245,158,11,0.4)' : 'transparent'}`,
            borderRadius: 3, cursor: 'pointer', padding: '1px 4px',
            fontSize: 9, color: missingOpen ? 'var(--warning)' : 'var(--text-muted)',
            transition: 'all 150ms', fontFamily: 'inherit',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--warning)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)' }}
          onMouseLeave={e => { if (!missingOpen) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'transparent' } }}
        >⚠</button>
      )}
    </div>
  )
}

function downloadBlob(content: string, filename: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function PoolSidebar() {
  const { data: substances = [] } = usePoolSubstances()
  const store = useOptimizerStore()
  const { selectedIds, toggleSubstance, availabilityLimits, setAvailability, targetFuelId, setTargetFuelId } = store
  const { data: poolMeta } = usePool(selectedIds)

  const [search, setSearch]           = useState('')
  const [typeFilter, setTypeFilter]   = useState<string>('all')
  const [showLimits, setShowLimits]   = useState<string | null>(null)
  const [showMissing, setShowMissing] = useState<string | null>(null)
  const [showTargetFuel, setShowTargetFuel] = useState(false)
  const fileInputRef     = useRef<HTMLInputElement>(null)
  const csvUploadRef     = useRef<HTMLInputElement>(null)
  const [csvMsg, setCsvMsg] = useState<string | null>(null)

  // Drop any persisted selectedIds that no longer exist in the DB (e.g. after re-injection)
  useEffect(() => {
    if (!substances.length) return
    const validIds = new Set(substances.map(s => s.substance_id))
    const stale = store.selectedIds.filter(id => !validIds.has(id))
    if (stale.length) store.setSelectedIds(store.selectedIds.filter(id => validIds.has(id)))
  }, [substances])

  const filtered = substances.filter(s => {
    const matchSearch = s.nom.toLowerCase().includes(search.toLowerCase())
    const matchType   = typeFilter === 'all' || s.substance_type === typeFilter
    return matchSearch && matchType
  })

  const grouped = filtered.reduce<Record<string, PoolSubstance[]>>((acc, s) => {
    ;(acc[s.substance_type] ??= []).push(s)
    return acc
  }, {})

  // Config save: serialize essential store state
  const handleConfigSave = () => {
    const config = {
      selectedIds:        store.selectedIds,
      availabilityLimits: store.availabilityLimits,
      targets:            store.targets,
      carbonDist:         store.carbonDist,
      scenario:           store.scenario,
      fpBasis:            store.fpBasis,
      nRestarts:          store.nRestarts,
      familyConstraints:  store.familyConstraints,
      componentCaps:      store.componentCaps,
      pfTargets:          store.pfTargets,
      sparsity:           store.sparsity,
      propertyConstraints: store.propertyConstraints,
      targetFuelId:       store.targetFuelId,
      distSpec:           store.distSpec,
    }
    downloadBlob(
      JSON.stringify(config, null, 2),
      `optimizer_config_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json',
    )
  }

  // Config load: handles both frontend camelCase and backend snake_case formats
  const handleConfigLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const cfg = JSON.parse(ev.target?.result as string)
        // substance_ids (backend) or selectedIds (frontend)
        const ids = cfg.substance_ids ?? cfg.selectedIds
        if (ids) store.setSelectedIds(ids)
        if (cfg.targets) Object.entries(cfg.targets).forEach(([k, v]) => store.setTarget(k as never, v as number))
        if (cfg.carbonDist)   store.setCarbonDist(cfg.carbonDist)
        if (cfg.carbon_dist)  store.setCarbonDist(cfg.carbon_dist)
        if (cfg.scenario)     store.setScenario(cfg.scenario)
        const fpBasis = cfg.fpBasis ?? cfg.fp_basis
        if (fpBasis) store.setFpBasis(fpBasis)
        const nRestarts = cfg.nRestarts ?? cfg.n_restarts
        if (nRestarts) store.setNRestarts(nRestarts)
        const fc = cfg.familyConstraints ?? cfg.family_constraints
        if (fc) Object.entries(fc).forEach(([k, v]) => store.setFamilyConstraint(k, v as never))
        const cc = cfg.componentCaps ?? cfg.component_caps
        if (cc) Object.entries(cc).forEach(([k, v]) => store.setComponentCap(k, v as never))
        const al = cfg.availabilityLimits ?? cfg.availability_limits
        if (al) Object.entries(al).forEach(([k, v]) => store.setAvailability(k, v as never))
        const pf = cfg.pfTargets ?? cfg.pf_targets
        if (pf) Object.entries(pf).forEach(([k, v]) => store.setPfTarget(k, v as never))
        const sparsity = cfg.sparsity
        if (sparsity !== undefined) store.setSparsity(sparsity && Object.keys(sparsity).length ? sparsity : null)
        if (cfg.propertyConstraints) Object.entries(cfg.propertyConstraints).forEach(([k, v]) => store.setPropertyConstraint(k, v as never))
        if (cfg.targetFuelId !== undefined) store.setTargetFuelId(cfg.targetFuelId)
        if (cfg.distSpec) Object.entries(cfg.distSpec).forEach(([k, v]) => store.setDistSpec(k, v as never))
      } catch {
        // malformed JSON — ignore silently
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Availability limits — CSV download (selected substances only)
  const handleLimitsDownload = () => {
    if (!selectedIds.length) return
    const rows = selectedIds.map(id => {
      const name = substances.find(s => s.substance_id === id)?.nom ?? id
      const lim  = availabilityLimits[id]
      const lo   = lim?.lo ?? 0
      const hi   = lim?.hi ?? 1
      return `${id},"${name}",${lo},${hi}`
    })
    const csv = `# Optimizer availability limits\nsubstance_id,name,min,max\n${rows.join('\n')}`
    downloadBlob(csv, `availability_limits_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv')
  }

  // Availability limits — CSV upload
  const handleLimitsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvMsg(null)
    const reader = new FileReader()
    reader.onload = ev => {
      const lines = (ev.target?.result as string).split('\n')
      let applied = 0
      for (const raw of lines) {
        const line = raw.trim()
        if (!line || line.startsWith('#') || line.startsWith('substance_id')) continue
        // Handle quoted name column: id,"name",lo,hi
        const parts = line.split(',')
        if (parts.length < 4) continue
        const id = parts[0].trim()
        // last two are always min, max (name may contain commas)
        const hi  = parseFloat(parts[parts.length - 1])
        const lo  = parseFloat(parts[parts.length - 2])
        if (!id || isNaN(lo) || isNaN(hi)) continue
        const limit: CapLimit = { lo: Math.max(0, Math.min(1, lo)), hi: Math.max(0, Math.min(1, hi)) }
        store.setAvailability(id, limit)
        applied++
      }
      setCsvMsg(applied > 0 ? `Applied limits for ${applied} substance${applied > 1 ? 's' : ''}` : 'No matching rows found')
      setTimeout(() => setCsvMsg(null), 3000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div style={{
      width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--border)', height: '100%', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.15em', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
            Substance Pool
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--accent)', marginRight: 4 }}>
              {selectedIds.length}
            </span>
            {/* Config JSON save/load */}
            {([
              { label: '⇣', title: 'Export session config as JSON', action: handleConfigSave },
              { label: '⇡', title: 'Import config from JSON file (frontend or backend format)', action: () => fileInputRef.current?.click() },
            ] as const).map(({ label, title, action }) => (
              <button key={label} onClick={action} title={title}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', fontSize: 11, padding: '2px 6px', color: 'var(--text-muted)', fontFamily: 'inherit', transition: 'all 150ms' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >{label}</button>
            ))}
            <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleConfigLoad} />

            {/* Availability limits CSV download/upload */}
            <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />
            {([
              { label: '↓CSV', title: 'Download availability limits as CSV', action: handleLimitsDownload, disabled: selectedIds.length === 0 },
              { label: '↑CSV', title: 'Upload availability limits from CSV', action: () => csvUploadRef.current?.click(), disabled: false },
            ] as const).map(({ label, title, action, disabled }) => (
              <button key={label} onClick={action} title={title} disabled={disabled}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 3, cursor: disabled ? 'default' : 'pointer', fontSize: 9, padding: '2px 5px', color: disabled ? 'var(--border-mid)' : 'var(--text-muted)', fontFamily: 'inherit', transition: 'all 150ms', letterSpacing: '0.02em' }}
                onMouseEnter={e => { if (!disabled) { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)' } }}
                onMouseLeave={e => { e.currentTarget.style.color = disabled ? 'var(--border-mid)' : 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >{label}</button>
            ))}
            <input ref={csvUploadRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleLimitsUpload} />
          </div>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search substances…"
          className="field"
          style={{ width: '100%', fontSize: 13, padding: '6px 10px', marginBottom: csvMsg ? 4 : 8 }}
        />
        {csvMsg && (
          <div style={{ fontSize: 10, color: 'var(--success)', marginBottom: 6, padding: '3px 4px', background: 'rgba(61,184,122,0.08)', borderRadius: 3 }}>
            ✓ {csvMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 3 }}>
          {['all', 'fuel', 'molecule', 'solvent'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                flex: 1, padding: '4px 0', borderRadius: 10, fontSize: 11,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: typeFilter === t ? 'var(--accent-muted)' : 'transparent',
                color: typeFilter === t ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'all 150ms', textTransform: 'capitalize',
              }}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Substance list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {Object.entries(grouped).map(([type, list]) => (
          <div key={type}>
            <div style={{
              padding: '5px 14px', fontSize: 10, letterSpacing: '0.2em',
              color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600,
            }}>
              {type.replace('_', ' ')}
            </div>
            {list.map(s => {
              const isSelected  = selectedIds.includes(s.substance_id)
              const isTargetFuel = targetFuelId === s.substance_id
              const dc           = poolMeta?.data_completeness?.[s.substance_id]

              return (
                <div key={s.substance_id}>
                  <div
                    onClick={() => toggleSubstance(s.substance_id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '8px 10px', cursor: 'pointer',
                      background: isSelected ? 'var(--accent-muted)' : 'transparent',
                      borderLeft: isTargetFuel ? '2px solid var(--warning)' : '2px solid transparent',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{
                      marginTop: 2, width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9,
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-mid)'}`,
                      color: '#fff', transition: 'all 150ms',
                    }}>
                      {isSelected && '✓'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: isTargetFuel ? 'var(--warning)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.nom}
                        {isTargetFuel && <span style={{ fontSize: 10, marginLeft: 4, color: 'var(--warning)' }}>REF</span>}
                      </div>
                      {isSelected && dc && (
                        <CompletenessBar
                          dc={dc}
                          onShowMissing={() => setShowMissing(showMissing === s.substance_id ? null : s.substance_id)}
                          missingOpen={showMissing === s.substance_id}
                        />
                      )}
                    </div>
                    {isSelected && (
                      <button
                        onClick={e => { e.stopPropagation(); setShowLimits(showLimits === s.substance_id ? null : s.substance_id) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', marginTop: 0, flexShrink: 0, fontFamily: 'inherit', padding: '0 2px', transition: 'color 150ms' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        title="Availability limits"
                      >⚙</button>
                    )}
                  </div>

                  {isSelected && showLimits === s.substance_id && (
                    <div style={{
                      margin: '0 10px 8px', padding: '8px 10px',
                      background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 5,
                    }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Availability limits (0–1)
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(['lo', 'hi'] as const).map(k => (
                          <div key={k} style={{ flex: 1 }}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{k === 'lo' ? 'Min' : 'Max'}</div>
                            <input
                              type="number" min={0} max={1} step={0.01}
                              value={availabilityLimits[s.substance_id]?.[k] ?? (k === 'lo' ? 0 : 1)}
                              onChange={e => setAvailability(s.substance_id, {
                                lo: k === 'lo' ? Number(e.target.value) : (availabilityLimits[s.substance_id]?.lo ?? 0),
                                hi: k === 'hi' ? Number(e.target.value) : (availabilityLimits[s.substance_id]?.hi ?? 1),
                              })}
                              className="field"
                              style={{ width: '100%', fontSize: 11, padding: '4px 6px' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isSelected && showMissing === s.substance_id && dc && dc.missing_fields.length > 0 && (
                    <div style={{
                      margin: '0 10px 8px', padding: '8px 10px',
                      background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 5,
                    }}>
                      <div style={{ fontSize: 10, color: 'var(--warning)', marginBottom: 6, fontWeight: 500 }}>
                        {dc.missing_fields.length} field{dc.missing_fields.length > 1 ? 's' : ''} missing
                      </div>
                      {dc.missing_fields.map(field => (
                        <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>
                          <span style={{ color: 'var(--danger)', fontSize: 9 }}>✕</span>
                          {FIELD_LABELS[field] ?? field}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Target fuel section */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => setShowTargetFuel(v => !v)}
          style={{
            width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Reference Fuel
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {targetFuelId && (
              <span style={{ fontSize: 9, color: 'var(--warning)', background: 'rgba(245,158,11,0.12)', padding: '1px 6px', borderRadius: 8 }}>
                {substances.find(s => s.substance_id === targetFuelId)?.nom?.slice(0, 12) ?? targetFuelId}
              </span>
            )}
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{showTargetFuel ? '▴' : '▾'}</span>
          </div>
        </button>
        {showTargetFuel && (
          <div style={{ padding: '0 14px 12px' }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.5 }}>
              Select a substance as a reference for comparison in result panels.
            </p>
            <select
              value={targetFuelId ?? ''}
              onChange={e => setTargetFuelId(e.target.value || null)}
              className="field"
              style={{ width: '100%', fontSize: 12, padding: '5px 8px' }}
            >
              <option value="">— None —</option>
              {substances.map(s => (
                <option key={s.substance_id} value={s.substance_id}>{s.nom}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pool missing data summary */}
      {poolMeta?.missing_data && Object.keys(poolMeta.missing_data).length > 0 && (
        <div style={{
          padding: '10px 14px', borderTop: '1px solid var(--border)',
          background: 'rgba(245,158,11,0.05)', flexShrink: 0,
        }}>
          <div style={{ fontSize: 10, color: 'var(--warning)', letterSpacing: '0.03em', marginBottom: 4 }}>
            ⚠ {Object.keys(poolMeta.missing_data).length} substance{Object.keys(poolMeta.missing_data).length > 1 ? 's' : ''} incomplete
          </div>
          {Object.entries(poolMeta.missing_data).slice(0, 3).map(([id, fields]) => {
            const name = substances.find(s => s.substance_id === id)?.nom ?? id
            return (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{name}</span>
                <span style={{ color: 'var(--danger)', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, flexShrink: 0 }}>{fields.length}✕</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
