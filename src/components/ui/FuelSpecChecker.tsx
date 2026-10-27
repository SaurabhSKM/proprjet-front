// src/components/ui/FuelSpecChecker.tsx
import { useState } from 'react'
import type { ComputedProperties } from '@/types'

type Status = 'pass' | 'fail' | 'na'

interface Criterion {
  key: string
  label: string
  unit: string
  min?: number
  max?: number
  getValue: (p: ComputedProperties) => number | null
}

interface FuelSpec {
  id: string
  name: string
  standard: string
  criteria: Criterion[]
}

// ── Spec definitions ──────────────────────────────────────────────────────────

const ASTM_D1655: FuelSpec = {
  id: 'jet_a',
  name: 'Jet A',
  standard: 'ASTM D1655',
  criteria: [
    {
      key: 'density',
      label: 'Density @15°C',
      unit: 'g/mL',
      min: 0.775,
      max: 0.840,
      getValue: p => p.density_sv_g_ml ?? p.density_linear_g_ml,
    },
    {
      key: 'fp',
      label: 'Flash Point',
      unit: '°C',
      min: 38,
      getValue: p => p.fp_mi_degC ?? p.fp_linear_degC,
    },
    {
      key: 'frzp',
      label: 'Freeze Point',
      unit: '°C',
      max: -40,
      getValue: p => p.frzp_linear,
    },
    {
      key: 'kv_m20',
      label: 'KV @−20°C',
      unit: 'mm²/s',
      max: 12,
      getValue: p => p.kv_m20_regression ?? p.kv_m20_linear,
    },
    {
      key: 't10',
      label: 'Distillation T10',
      unit: '°C',
      max: 205,
      getValue: p => p.dist_t10_linear,
    },
    {
      key: 'fbp',
      label: 'Distillation FBP',
      unit: '°C',
      max: 300,
      getValue: p => p.dist_fbp_linear,
    },
    {
      key: 'lhv',
      label: 'Net Heat of Combustion',
      unit: 'MJ/kg',
      min: 42.8,
      getValue: p => p.lhv_linear,
    },
  ],
}

const DEF_STAN: FuelSpec = {
  id: 'jet_a1',
  name: 'Jet A-1',
  standard: 'DEF STAN 91-091',
  criteria: [
    {
      key: 'density',
      label: 'Density @15°C',
      unit: 'g/mL',
      min: 0.775,
      max: 0.840,
      getValue: p => p.density_sv_g_ml ?? p.density_linear_g_ml,
    },
    {
      key: 'fp',
      label: 'Flash Point',
      unit: '°C',
      min: 38,
      getValue: p => p.fp_mi_degC ?? p.fp_linear_degC,
    },
    {
      key: 'frzp',
      label: 'Freeze Point',
      unit: '°C',
      max: -47,
      getValue: p => p.frzp_linear,
    },
    {
      key: 'kv_m20',
      label: 'KV @−20°C',
      unit: 'mm²/s',
      max: 8,
      getValue: p => p.kv_m20_regression ?? p.kv_m20_linear,
    },
    {
      key: 't10',
      label: 'Distillation T10',
      unit: '°C',
      max: 205,
      getValue: p => p.dist_t10_linear,
    },
    {
      key: 'fbp',
      label: 'Distillation FBP',
      unit: '°C',
      max: 300,
      getValue: p => p.dist_fbp_linear,
    },
    {
      key: 'lhv',
      label: 'Net Heat of Combustion',
      unit: 'MJ/kg',
      min: 42.8,
      getValue: p => p.lhv_linear,
    },
  ],
}

const JETX: FuelSpec = {
  id: 'jetx',
  name: 'JetX',
  standard: 'Internal spec',
  criteria: [
    {
      key: 'density',
      label: 'Density @15°C',
      unit: 'g/mL',
      min: 0.775,
      max: 0.840,
      getValue: p => p.density_sv_g_ml ?? p.density_linear_g_ml,
    },
    {
      key: 'fp',
      label: 'Flash Point',
      unit: '°C',
      min: 38,
      getValue: p => p.fp_mi_degC ?? p.fp_linear_degC,
    },
    {
      key: 'frzp',
      label: 'Freeze Point',
      unit: '°C',
      max: -47,
      getValue: p => p.frzp_linear,
    },
    {
      key: 't10',
      label: 'Distillation T10',
      unit: '°C',
      min: 160,
      max: 205,
      getValue: p => p.dist_t10_linear,
    },
    {
      key: 't50',
      label: 'Distillation T50',
      unit: '°C',
      min: 185,
      max: 225,
      getValue: p => p.dist_t50_linear,
    },
    {
      key: 't90',
      label: 'Distillation T90',
      unit: '°C',
      min: 215,
      max: 265,
      getValue: p => p.dist_t90_linear,
    },
    {
      key: 'fbp',
      label: 'Distillation FBP',
      unit: '°C',
      min: 230,
      max: 300,
      getValue: p => p.dist_fbp_linear,
    },
    {
      key: 't90_t10',
      label: 'T90 − T10',
      unit: '°C',
      min: 40,
      getValue: p => {
        const t10 = p.dist_t10_linear
        const t90 = p.dist_t90_linear
        return t10 != null && t90 != null ? t90 - t10 : null
      },
    },
    {
      key: 't50_t10',
      label: 'T50 − T10',
      unit: '°C',
      min: 15,
      getValue: p => {
        const t10 = p.dist_t10_linear
        const t50 = p.dist_t50_linear
        return t10 != null && t50 != null ? t50 - t10 : null
      },
    },
  ],
}

const SPECS: FuelSpec[] = [ASTM_D1655, DEF_STAN, JETX]

// ── Helpers ───────────────────────────────────────────────────────────────────

function evaluate(c: Criterion, props: ComputedProperties): { value: number | null; status: Status } {
  const value = c.getValue(props)
  if (value == null) return { value: null, status: 'na' }
  const failMin = c.min != null && value < c.min
  const failMax = c.max != null && value > c.max
  return { value, status: failMin || failMax ? 'fail' : 'pass' }
}

function limitLabel(c: Criterion): string {
  if (c.min != null && c.max != null) return `${c.min} – ${c.max}`
  if (c.min != null) return `≥ ${c.min}`
  if (c.max != null) return `≤ ${c.max}`
  return '—'
}

function fmtValue(v: number | null, decimals = 3): string {
  if (v == null) return '—'
  return v.toFixed(decimals)
}

function decimalsFor(unit: string): number {
  if (unit === 'g/mL') return 4
  if (unit === '°C')   return 1
  return 3
}

const STATUS_STYLE: Record<Status, { color: string; symbol: string }> = {
  pass: { color: '#3db87a', symbol: '✓' },
  fail: { color: '#e05252', symbol: '✗' },
  na:   { color: 'var(--text-muted)', symbol: '—' },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FuelSpecChecker({ props }: { props: ComputedProperties }) {
  const [activeSpec, setActiveSpec] = useState<string>(SPECS[0].id)

  const spec = SPECS.find(s => s.id === activeSpec) ?? SPECS[0]
  const results = spec.criteria.map(c => ({ ...c, ...evaluate(c, props) }))

  const passed  = results.filter(r => r.status === 'pass').length
  const failed  = results.filter(r => r.status === 'fail').length
  const missing = results.filter(r => r.status === 'na').length

  const overall: Status =
    failed > 0 ? 'fail' : missing === results.length ? 'na' : 'pass'

  const OVERALL_LABEL: Record<Status, string> = {
    pass: 'ALL PASS',
    fail: `${failed} FAIL`,
    na:   'NO DATA',
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      background: 'var(--bg-surface)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}>
        {/* Spec selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          {SPECS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSpec(s.id)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: activeSpec === s.id ? 600 : 400,
                letterSpacing: '0.06em',
                border: '1px solid',
                borderColor: activeSpec === s.id ? 'var(--accent)' : 'var(--border)',
                borderRadius: 4,
                background: activeSpec === s.id ? 'var(--accent-muted)' : 'transparent',
                color: activeSpec === s.id ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 120ms',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Overall result */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{spec.standard}</span>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '3px 10px',
            borderRadius: 4,
            background: overall === 'pass' ? 'rgba(61, 184, 122, 0.12)' : overall === 'fail' ? 'rgba(224, 82, 82, 0.12)' : 'var(--bg-elevated)',
            color: STATUS_STYLE[overall].color,
            border: `1px solid ${STATUS_STYLE[overall].color}`,
          }}>
            {OVERALL_LABEL[overall]}
          </span>
        </div>
      </div>

      {/* Criteria table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--bg-elevated)' }}>
            <th style={{ padding: '6px 14px', textAlign: 'left', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>Criterion</th>
            <th style={{ padding: '6px 14px', textAlign: 'right', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>Limit</th>
            <th style={{ padding: '6px 14px', textAlign: 'right', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>Value</th>
            <th style={{ padding: '6px 14px', textAlign: 'center', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500, width: 40 }}>OK</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const { color, symbol } = STATUS_STYLE[r.status]
            return (
              <tr
                key={r.key}
                style={{
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  background: r.status === 'fail' ? 'rgba(224, 82, 82, 0.04)' : 'transparent',
                }}
              >
                <td style={{ padding: '7px 14px', color: 'var(--text-secondary)' }}>
                  {r.label}
                  <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)' }}>{r.unit}</span>
                </td>
                <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-muted)', fontSize: 11 }}>
                  {limitLabel(r)}
                </td>
                <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: r.status === 'fail' ? color : 'var(--text-primary)', fontWeight: r.status === 'fail' ? 600 : 400 }}>
                  {fmtValue(r.value, decimalsFor(r.unit))}
                </td>
                <td style={{ padding: '7px 14px', textAlign: 'center', fontWeight: 700, color }}>
                  {symbol}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Footer counts */}
      <div style={{
        padding: '6px 14px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: 16,
        fontSize: 10,
        color: 'var(--text-muted)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        <span style={{ color: '#3db87a' }}>{passed} pass</span>
        {failed > 0 && <span style={{ color: '#e05252' }}>{failed} fail</span>}
        {missing > 0 && <span>{missing} n/a</span>}
      </div>
    </div>
  )
}
