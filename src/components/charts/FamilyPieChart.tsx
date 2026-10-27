// src/components/charts/FamilyPieChart.tsx
import Plot from 'react-plotly.js'
import { useChartColors } from '@/hooks/useChartColors'

const FAMILY_COLORS = ['#4C9BE8', '#52C893', '#F5A742', '#E8567A']
const FAMILY_LABELS = ['n-Paraffins', 'Isoparaffins', 'Cycloparaffins', 'Aromatics']

export function FamilyPieChart({
  nPara,
  isoPara,
  cyclo,
  arom,
  height = 220,
  title = 'Family Composition',
}: {
  nPara: number | null
  isoPara: number | null
  cyclo: number | null
  arom: number | null
  height?: number
  title?: string
}) {
  const C = useChartColors()

  const values = [nPara ?? 0, isoPara ?? 0, cyclo ?? 0, arom ?? 0]
  if (values.every(v => v === 0)) return null

  return (
    <Plot
      data={[{
        type: 'pie',
        labels: FAMILY_LABELS,
        values,
        marker: {
          colors: FAMILY_COLORS,
          line: { color: C.bg, width: 2 },
        },
        textinfo: 'percent',
        textfont: { size: 11, color: '#fff', family: 'JetBrains Mono, ui-monospace, monospace' },
        hovertemplate: '<b>%{label}</b><br>%{value:.1f}%<extra></extra>',
        hole: 0.35,
        sort: false,
      }]}
      layout={{
        height,
        margin: { l: 10, r: 10, t: 30, b: 10 },
        title: { text: title, font: { color: C.textMuted, size: 11 }, x: 0.5 },
        paper_bgcolor: C.bg,
        showlegend: true,
        legend: {
          orientation: 'v',
          x: 1.02,
          y: 0.5,
          font: { size: 10, color: C.textSecondary, family: 'JetBrains Mono, ui-monospace, monospace' },
          bgcolor: 'transparent',
        },
        font: { family: 'JetBrains Mono, ui-monospace, monospace', size: 10, color: C.textSecondary },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
    />
  )
}
