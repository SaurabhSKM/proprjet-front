// src/components/charts/PropertyRadarChart.tsx
import Plot from 'react-plotly.js'
import { useChartColors } from '@/hooks/useChartColors'
import type { SubstanceProperty } from '@/types'

export interface SubstanceProfile {
  id: string
  name: string
  properties: SubstanceProperty[]
}

const PALETTE = ['#4C9BE8', '#52C893', '#F5A742', '#E8567A', '#A78BFA', '#F87171']

// ── Helpers ───────────────────────────────────────────────────────────────────

function bestValue(prop: SubstanceProperty): number | null {
  if (!prop.values.length) return null
  // take median of available values to reduce outlier sensitivity
  const vals = prop.values.map(v => v.value).sort((a, b) => a - b)
  return vals[Math.floor(vals.length / 2)]
}

function buildAxes(profiles: SubstanceProfile[]): string[] {
  const count: Record<string, number> = {}
  for (const p of profiles) {
    for (const prop of p.properties) {
      count[prop.property_name] = (count[prop.property_name] ?? 0) + 1
    }
  }
  // keep props present in ≥2 substances, sort by coverage desc then alpha
  return Object.entries(count)
    .filter(([, n]) => n >= 2)
    .sort(([a, na], [b, nb]) => nb - na || a.localeCompare(b))
    .slice(0, 10)
    .map(([name]) => name)
}

function normalise(values: (number | null)[]): (number | null)[] {
  const nums = values.filter((v): v is number => v != null)
  if (nums.length === 0) return values
  const lo = Math.min(...nums)
  const hi = Math.max(...nums)
  if (hi === lo) return values.map(v => (v == null ? null : 0.5))
  return values.map(v => (v == null ? null : (v - lo) / (hi - lo)))
}

// ── Chart ─────────────────────────────────────────────────────────────────────

export function PropertyRadarChart({ profiles }: { profiles: SubstanceProfile[] }) {
  const C    = useChartColors()
  const axes = buildAxes(profiles)

  if (axes.length < 2) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
        Not enough shared properties to draw a radar chart.<br />
        Select substances with common property measurements.
      </div>
    )
  }

  // raw values per axis per substance
  const rawMatrix: (number | null)[][] = axes.map(axis =>
    profiles.map(p => {
      const prop = p.properties.find(x => x.property_name === axis)
      return prop ? bestValue(prop) : null
    })
  )

  // normalise per axis (column-wise)
  const normMatrix: (number | null)[][] = rawMatrix.map(col => normalise(col))

  const traces = profiles.map((p, si) => ({
    type:   'scatterpolar' as const,
    name:   p.name,
    r:      axes.map((_, ai) => normMatrix[ai][si] ?? null),
    theta:  axes,
    fill:   'toself' as const,
    opacity: 0.65,
    line:   { color: PALETTE[si % PALETTE.length], width: 2 },
    marker: { color: PALETTE[si % PALETTE.length], size: 5 },
    hovertemplate: axes.map((axis, ai) => {
      const raw = rawMatrix[ai][si]
      return `<b>${axis}</b>: ${raw != null ? raw.toFixed(3) : 'n/a'}<extra>${p.name}</extra>`
    }).join(''),
  }))

  return (
    <Plot
      data={traces}
      layout={{
        polar: {
          bgcolor: C.bg,
          radialaxis: {
            visible: true,
            range: [0, 1],
            tickfont: { size: 9, color: C.textMuted },
            gridcolor: C.borderMid,
            linecolor: C.borderMid,
          },
          angularaxis: {
            tickfont: { size: 10, color: C.textSecondary },
            gridcolor: C.borderMid,
            linecolor: C.borderMid,
          },
        },
        showlegend: true,
        legend: {
          orientation: 'h',
          y: -0.1,
          font: { size: 10, color: C.textSecondary },
          bgcolor: 'transparent',
        },
        paper_bgcolor: C.bg,
        plot_bgcolor:  C.bg,
        margin: { l: 60, r: 60, t: 40, b: 40 },
        font: { family: 'Inter, system-ui, sans-serif', size: 10, color: C.textSecondary },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%', height: 420 }}
    />
  )
}

// ── Comparison table ──────────────────────────────────────────────────────────

export function PropertyComparisonTable({ profiles }: { profiles: SubstanceProfile[] }) {
  const axes = buildAxes(profiles)

  if (axes.length === 0) return null

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>
              Property
            </th>
            {profiles.map((p, i) => (
              <th key={p.id} style={{ padding: '7px 12px', textAlign: 'right', fontSize: 11, color: PALETTE[i % PALETTE.length], borderBottom: '1px solid var(--border)', fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {axes.map((axis, _ri) => {
            const vals = profiles.map(p => {
              const prop = p.properties.find(x => x.property_name === axis)
              return prop ? bestValue(prop) : null
            })
            const unit = (() => {
              for (const p of profiles) {
                const prop = p.properties.find(x => x.property_name === axis)
                if (prop?.standard_unit) return prop.standard_unit
              }
              return ''
            })()
            const nums = vals.filter((v): v is number => v != null)
            const best = nums.length ? Math.max(...nums) : null

            return (
              <tr
                key={axis}
                style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>
                  {axis}
                  {unit && <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--text-muted)' }}>({unit})</span>}
                </td>
                {vals.map((v, si) => (
                  <td key={si} style={{
                    padding: '6px 12px',
                    textAlign: 'right',
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    color: v != null && v === best ? 'var(--accent)' : 'var(--text-primary)',
                    fontWeight: v != null && v === best ? 600 : 400,
                  }}>
                    {v != null ? v.toFixed(3) : '—'}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
