// src/components/charts/CarbonProfileChart.tsx
import Plot from 'react-plotly.js'
import { useChartColors } from '@/hooks/useChartColors'

const CARBONS = Array.from({ length: 20 }, (_, i) => `C${i + 6}`)

export function CarbonProfileChart({
  values,
  title = 'Carbon Distribution',
  height = 200,
}: {
  values: number[]
  title?: string
  height?: number
}) {
  const C = useChartColors()

  return (
    <Plot
      data={[{
        x: CARBONS,
        y: values,
        type: 'bar',
        marker: {
          color: values.map((_, i) => {
            // Gradient: lighter bars for higher carbons
            const t = i / (CARBONS.length - 1)
            return C.isDark
              ? `hsl(${200 + t * 30}, ${55 - t * 15}%, ${40 + t * 20}%)`
              : `hsl(${210 + t * 20}, ${55 - t * 10}%, ${45 + t * 10}%)`
          }),
          opacity: 0.9,
          line: { color: C.border, width: 0.5 },
        },
      }]}
      layout={{
        height,
        margin: { l: 42, r: 10, t: 26, b: 40 },
        title: { text: title, font: { color: C.textMuted, size: 11 }, x: 0 },
        paper_bgcolor: C.bg,
        plot_bgcolor:  C.surface,
        xaxis: {
          color: C.textMuted,
          gridcolor: C.border,
          linecolor: C.borderMid,
          tickfont: { size: 9, color: C.textSecondary },
          zeroline: false,
        },
        yaxis: {
          color: C.textMuted,
          gridcolor: C.border,
          linecolor: C.borderMid,
          tickfont: { size: 10, color: C.textSecondary },
          zeroline: false,
        },
        font: { family: 'JetBrains Mono, ui-monospace, monospace', size: 10, color: C.textSecondary },
        bargap: 0.15,
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
    />
  )
}
