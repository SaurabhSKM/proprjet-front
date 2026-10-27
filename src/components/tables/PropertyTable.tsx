// src/components/tables/PropertyTable.tsx
import type { ComputedProperties } from '@/types'

type Row = { label: string; keys: (keyof ComputedProperties)[]; unit: string }

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'Density',
    rows: [
      { label: 'Specific Volume',  keys: ['density_sv_g_ml'],     unit: 'g/mL' },
      { label: 'Linear Average',   keys: ['density_linear_g_ml'], unit: 'g/mL' },
      { label: 'GCxGC Ridge',      keys: ['density_gcgc_g_ml'],   unit: 'g/mL' },
    ],
  },
  {
    title: 'Flash Point',
    rows: [
      { label: 'MI Model',   keys: ['fp_mi_degC'],     unit: '°C' },
      { label: 'Linear',     keys: ['fp_linear_degC'], unit: '°C' },
    ],
  },
  {
    title: 'Kinematic Viscosity',
    rows: [
      { label: 'KV +40°C (Zhmud)',   keys: ['kv_p40_zhmud'],         unit: 'mm²/s' },
      { label: 'KV +40°C (LeChat)',  keys: ['kv_p40_lechat'],        unit: 'mm²/s' },
      { label: 'KV +40°C (Linear)',  keys: ['kv_p40_linear'],        unit: 'mm²/s' },
      { label: 'KV +20°C (Regr.)',   keys: ['kv_p20_regression'],    unit: 'mm²/s' },
      { label: 'KV −20°C (Regr.)',   keys: ['kv_m20_regression'],    unit: 'mm²/s' },
      { label: 'KV −20°C (Linear)',  keys: ['kv_m20_linear'],        unit: 'mm²/s' },
      { label: 'KV −40°C (Regr.)',   keys: ['kv_m40_regression'],    unit: 'mm²/s' },
      { label: 'KV −40°C (Linear)',  keys: ['kv_m40_linear'],        unit: 'mm²/s' },
    ],
  },
  {
    title: 'Surface Tension',
    rows: [
      { label: '25°C (ρ only)',    keys: ['surft_25_rho_mn_m'],    unit: 'mN/m' },
      { label: '25°C (ρ + FP)',    keys: ['surft_25_rho_fp_mn_m'], unit: 'mN/m' },
      { label: '10°C (DB linear)', keys: ['surft_10_linear'],      unit: 'mN/m' },
      { label: '20°C (DB linear)', keys: ['surft_20_linear'],      unit: 'mN/m' },
      { label: '40°C (DB linear)', keys: ['surft_40_linear'],      unit: 'mN/m' },
    ],
  },
  {
    title: 'Family Composition',
    rows: [
      { label: 'n-Paraffins',    keys: ['n_paraffins_pct'],  unit: '%' },
      { label: 'Isoparaffins',   keys: ['isoparaffins_pct'], unit: '%' },
      { label: 'Cycloparaffins', keys: ['cyclopara_pct'],    unit: '%' },
      { label: 'Aromatics',      keys: ['aromatics_pct'],    unit: '%' },
    ],
  },
  {
    title: 'Chemistry',
    rows: [
      { label: 'MW (linear)',     keys: ['mw_linear'],          unit: 'g/mol' },
      { label: 'C mass',          keys: ['cmass'],               unit: 'g/100g' },
      { label: 'C mass ratio',    keys: ['cmass_ratio_linear'],  unit: '%' },
      { label: 'H mass ratio',    keys: ['hmass_linear'],        unit: '%' },
      { label: 'H/C mass',        keys: ['hc_mass_linear'],      unit: '—' },
      { label: 'S content',       keys: ['s_ppmm_linear'],       unit: 'ppm(m)' },
    ],
  },
  {
    title: 'Energy & Ignition',
    rows: [
      { label: 'LHV',        keys: ['lhv_linear'],    unit: 'MJ/kg' },
      { label: 'CN',         keys: ['cn_linear'],     unit: '—' },
      { label: 'AIT',        keys: ['ait_linear'],    unit: '°C' },
      { label: 'LFL @100°C', keys: ['lfl100_lechat'], unit: '%vol' },
      { label: 'UFL @100°C', keys: ['ufl100_lechat'], unit: '%vol' },
      { label: 'Freeze pt',  keys: ['frzp_linear'],   unit: '°C' },
    ],
  },
  {
    title: 'Heat Capacity',
    rows: [
      { label: 'Cp 0°C',  keys: ['cp_0_linear'],  unit: 'kJ/kg·K' },
      { label: 'Cp 20°C', keys: ['cp_20_linear'], unit: 'kJ/kg·K' },
      { label: 'Cp 40°C', keys: ['cp_40_linear'], unit: 'kJ/kg·K' },
    ],
  },
  {
    title: 'Distillation (DB linear)',
    rows: [
      { label: 'IBP', keys: ['dist_ibp_linear'], unit: '°C' },
      { label: 'T10', keys: ['dist_t10_linear'], unit: '°C' },
      { label: 'T50', keys: ['dist_t50_linear'], unit: '°C' },
      { label: 'T90', keys: ['dist_t90_linear'], unit: '°C' },
      { label: 'FBP', keys: ['dist_fbp_linear'], unit: '°C' },
    ],
  },
]

function fmt(v: number | null | undefined): string {
  if (v == null) return '—'
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 1 })
  if (Math.abs(v) >= 10)   return v.toFixed(2)
  return v.toFixed(4)
}

export function PropertyTable({ props }: { props: ComputedProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {GROUPS.map(g => (
        <div key={g.title}>
          <div style={{ fontSize: 10, letterSpacing: '0.25em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, padding: '0 4px' }}>
            {g.title}
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            {g.rows.map((row, i) => {
              const val = row.keys.length === 1 ? props[row.keys[0]] : null
              const isNull = val == null
              return (
                <div
                  key={row.label}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '6px 12px', fontSize: 12,
                    background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)', width: 176, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.label}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', marginLeft: 'auto', color: isNull ? 'var(--border-hi)' : 'var(--text-primary)' }}>
                    {fmt(val as number | null)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--border-hi)', marginLeft: 12, width: 64, textAlign: 'right' }}>
                    {row.unit}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
