// src/components/charts/GCxGCHeatmap.tsx
import Plot from 'react-plotly.js'
import { useChartColors } from '@/hooks/useChartColors'

// Canonical display order + labels for subfamily totals
const SUBFAMILY_DISPLAY = [
  { key: 'npara',           short: 'n-Par',  label: 'n-Paraffins' },
  { key: 'isopara',         short: 'iso-Par', label: 'Isoparaffins' },
  { key: 'monocyclopara',   short: 'MCP',    label: 'Monocycloparaffins' },
  { key: 'dicyclopara',     short: 'DCP',    label: 'Dicycloparaffins' },
  { key: 'tricyclopara',    short: 'TCP',    label: 'Tricycloparaffins' },
  { key: 'monoaroma',       short: 'MA',     label: 'Monoaromatics' },
  { key: 'diaroma',         short: 'DA',     label: 'Diaromatics' },
  { key: 'cyclomonoaroma',  short: 'CMA',    label: 'Cyclomonoaromatics' },
  { key: 'cyclodiaroma',    short: 'CDA',    label: 'Cyclodiaromatics' },
  { key: 'cyclopolyaroma',  short: 'CPA',    label: 'Cyclopolyaromatics' },
]

export function SubfamilyTable({
  totals,
}: {
  totals: Record<string, number>
}) {
  const entries = SUBFAMILY_DISPLAY.map(sf => ({
    ...sf,
    value: totals[sf.key] ?? 0,
  }))

  const coverage = totals['gcxgc_coverage'] ?? 0
  if (coverage === 0) return null

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        fontSize: 10, letterSpacing: '0.25em', color: 'var(--text-muted)',
        textTransform: 'uppercase', marginBottom: 6, padding: '0 4px',
      }}>
        <span>Subfamily Totals</span>
        <span style={{ letterSpacing: 0, fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
          coverage {coverage.toFixed(1)}%
        </span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 1,
        border: '1px solid var(--border)',
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        {entries.map((sf, i) => (
          <div
            key={sf.key}
            title={sf.label}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 4px',
              background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)',
              gap: 2,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
              {sf.short}
            </span>
            <span style={{
              fontSize: 12,
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              color: sf.value > 0.05 ? 'var(--text-primary)' : 'var(--border-hi)',
            }}>
              {sf.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const SUBFAMILIES = [
  'npara', 'isopara',
  'monocyclopara', 'dicyclopara', 'tricyclopara',
  'monoaroma', 'diaroma', 'cyclomonoaroma', 'cyclodiaroma', 'cyclopolyaroma',
]

const SUBFAMILY_LABELS: Record<string, string> = {
  npara:            'n-Par',
  isopara:          'iso-Par',
  monocyclopara:    'MCP',
  dicyclopara:      'DCP',
  tricyclopara:     'TCP',
  monoaroma:        'MA',
  diaroma:          'DA',
  cyclomonoaroma:   'CMA',
  cyclodiaroma:     'CDA',
  cyclopolyaroma:   'CPA',
}


export function GCxGCHeatmap({
  rows,
  height = 300,
  title = 'GCxGC Composition (%)',
}: {
  rows: Record<string, number | string>[]
  height?: number
  title?: string
}) {
  const C = useChartColors()

  if (!rows?.length) return null

  const z: number[][] = rows.map(row =>
    SUBFAMILIES.map(sf => {
      const val = row[`${sf}_pct`]
      return typeof val === 'number' ? val : 0
    })
  )

  const xLabels = SUBFAMILIES.map(sf => SUBFAMILY_LABELS[sf] ?? sf)
  const yLabels = rows.map(row => row['carbon'] as string)

  return (
    <Plot
      data={[{
        type: 'heatmap',
        z,
        x: xLabels,
        y: yLabels,
        colorscale: C.heatscale,
        showscale: true,
        colorbar: {
          thickness: 12,
          len: 0.8,
          tickfont: { size: 9, color: C.textSecondary, family: 'JetBrains Mono, monospace' },
          title: { text: '%', font: { size: 10, color: C.textMuted }, side: 'right' },
          bgcolor: C.surface,
          bordercolor: C.border,
          borderwidth: 1,
          outlinecolor: C.border,
          outlinewidth: 1,
        },
        hovertemplate: '<b>%{y} %{x}</b><br>%{z:.4f} %<extra></extra>',
        xgap: 1,
        ygap: 1,
      }]}
      layout={{
        height,
        margin: { l: 46, r: 64, t: 30, b: 62 },
        title: { text: title, font: { color: C.textMuted, size: 11 }, x: 0 },
        paper_bgcolor: C.bg,
        plot_bgcolor:  C.bg,
        xaxis: {
          color: C.textMuted,
          tickfont: { size: 10, family: 'JetBrains Mono, monospace', color: C.textSecondary },
          side: 'bottom',
          linecolor: C.borderMid,
        },
        yaxis: {
          color: C.textMuted,
          tickfont: { size: 10, family: 'JetBrains Mono, monospace', color: C.textSecondary },
          autorange: 'reversed',
          linecolor: C.borderMid,
        },
        font: { family: 'JetBrains Mono, ui-monospace, monospace', size: 10, color: C.textSecondary },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
    />
  )
}
