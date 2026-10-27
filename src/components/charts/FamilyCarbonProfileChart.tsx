// src/components/charts/FamilyCarbonProfileChart.tsx
import Plot from 'react-plotly.js'
import { useChartColors } from '@/hooks/useChartColors'

const FAMILY_TRACES = [
  {
    key: 'npara',
    label: 'n-Paraffins',
    color: '#4C9BE8',
    cols: ['n_paraffines'],
  },
  {
    key: 'isopara',
    label: 'Isoparaffins',
    color: '#52C893',
    cols: ['i_paraffines'],
  },
  {
    key: 'cyclo',
    label: 'Cycloparaffins',
    color: '#F5A742',
    cols: ['mononaphthene', 'dinaphthenes', 'trinaphtenes'],
  },
  {
    key: 'arom',
    label: 'Aromatics',
    color: '#E8567A',
    cols: ['aromatiques', 'naphteneo_aromatiques', 'diaromatiques', 'naphteno_diaro', 'triaromatiques', 'polyaroma'],
  },
]

export function FamilyCarbonProfileChart({
  rows,
  height = 260,
}: {
  rows: Record<string, number | string>[]
  height?: number
}) {
  const C = useChartColors()
  if (!rows?.length) return null

  const carbons = rows.map(r => r['carbon'] as string)

  const traces = FAMILY_TRACES.map(fam => ({
    type: 'scatter' as const,
    mode: 'lines+markers' as const,
    name: fam.label,
    x: carbons,
    y: rows.map(row =>
      fam.cols.reduce((sum, col) => sum + ((row[col] as number) ?? 0), 0)
    ),
    line: { color: fam.color, width: 2 },
    marker: { color: fam.color, size: 5 },
    hovertemplate: `<b>${fam.label}</b> %{x}: %{y:.2f}%<extra></extra>`,
  }))

  return (
    <Plot
      data={traces}
      layout={{
        height,
        margin: { l: 44, r: 16, t: 28, b: 56 },
        title: { text: 'Per-Family Carbon Profile', font: { color: C.textMuted, size: 11 }, x: 0 },
        paper_bgcolor: C.bg,
        plot_bgcolor: C.bg,
        legend: {
          orientation: 'h',
          y: -0.28,
          font: { size: 10, color: C.textSecondary },
          bgcolor: 'transparent',
        },
        xaxis: {
          color: C.textMuted,
          tickfont: { size: 10, family: 'JetBrains Mono, monospace', color: C.textSecondary },
          gridcolor: C.borderMid,
          zeroline: false,
        },
        yaxis: {
          color: C.textMuted,
          tickfont: { size: 10, family: 'JetBrains Mono, monospace', color: C.textSecondary },
          gridcolor: C.borderMid,
          zeroline: false,
          ticksuffix: '%',
        },
        font: { family: 'JetBrains Mono, ui-monospace, monospace', size: 10, color: C.textSecondary },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
    />
  )
}
