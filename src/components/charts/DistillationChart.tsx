// src/components/charts/DistillationChart.tsx
import Plot from 'react-plotly.js'
import type { DistillationPoint } from '@/types'
import { JETX_SPEC } from '@/constants/eos'
import { useChartColors } from '@/hooks/useChartColors'

export function DistillationChart({
  curve,
  points,
  showSpec = true,
  height = 320,
  title = 'TBP Distillation Curve',
}: {
  curve: DistillationPoint[]
  points?: Record<string, number>
  showSpec?: boolean
  height?: number
  title?: string
}) {
  const C = useChartColors()

  const traces: Plotly.Data[] = [
    {
      x: curve.map(p => p.Vpct),
      y: curve.map(p => p.T_C),
      type: 'scatter',
      mode: 'lines',
      name: 'Distillation',
      line: { color: C.accent, width: 2.5 },
    },
  ]

  if (points) {
    const ptMap: Record<string, number> = {
      ibp: 0, t10: 10, t20: 20, t30: 30,
      t50: 50, t70: 70, t90: 90, fbp: 100,
    }
    const xs = Object.entries(ptMap).filter(([k]) => points[k] != null).map(([, v]) => v)
    const ys = Object.entries(ptMap).filter(([k]) => points[k] != null).map(([k]) => points[k])
    traces.push({
      x: xs, y: ys, type: 'scatter', mode: 'markers',
      name: 'Key points',
      marker: { color: C.warning, size: 7, line: { color: C.bg, width: 1 } },
    })
  }

  const shapes: Partial<Plotly.Shape>[] = []
  const annotations: Partial<Plotly.Annotations>[] = []

  if (showSpec) {
    shapes.push({
      type: 'line', x0: 10, x1: 10, y0: 0, y1: JETX_SPEC.T10_max_C,
      line: { color: C.success, width: 1, dash: 'dot' },
    })
    shapes.push({
      type: 'rect', x0: 0, x1: 100,
      y0: JETX_SPEC.T10_max_C, y1: JETX_SPEC.T10_max_C + 5,
      fillcolor: C.success, opacity: 0.08, line: { width: 0 },
    })
    shapes.push({
      type: 'rect', x0: 0, x1: 100,
      y0: JETX_SPEC.T90_max_C, y1: JETX_SPEC.T90_max_C + 5,
      fillcolor: C.danger, opacity: 0.08, line: { width: 0 },
    })
    annotations.push({
      x: 94, y: JETX_SPEC.T90_max_C + 3.5,
      text: 'T90 max', showarrow: false,
      font: { size: 9, color: C.danger },
    })
    annotations.push({
      x: 6, y: JETX_SPEC.T10_max_C - 4,
      text: 'T10 max', showarrow: false,
      font: { size: 9, color: C.success },
    })
  }

  return (
    <Plot
      data={traces as Plotly.Data[]}
      layout={{
        height,
        margin: { l: 52, r: 20, t: 30, b: 46 },
        title: { text: title, font: { color: C.textMuted, size: 11 }, x: 0 },
        paper_bgcolor: C.bg,
        plot_bgcolor:  C.surface,
        xaxis: {
          title: { text: 'Volume % distilled', font: { color: C.textMuted, size: 10 } },
          color: C.textMuted,
          gridcolor: C.border,
          linecolor: C.borderMid,
          tickfont: { color: C.textSecondary, size: 10 },
          range: [0, 100],
          zeroline: false,
        },
        yaxis: {
          title: { text: 'Temperature (°C)', font: { color: C.textMuted, size: 10 } },
          color: C.textMuted,
          gridcolor: C.border,
          linecolor: C.borderMid,
          tickfont: { color: C.textSecondary, size: 10 },
          zeroline: false,
        },
        font: { family: 'JetBrains Mono, ui-monospace, monospace', size: 10, color: C.textSecondary },
        legend: {
          font: { size: 10, color: C.textSecondary },
          bgcolor: C.surface,
          bordercolor: C.border,
          borderwidth: 1,
        },
        shapes,
        annotations,
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function PvapChart({
  curve,
  height = 260,
}: {
  curve: { T_C: number; Pvap_kPa: number }[]
  height?: number
}) {
  const C = useChartColors()

  return (
    <Plot
      data={[{
        x: curve.map(p => p.T_C),
        y: curve.map(p => p.Pvap_kPa),
        type: 'scatter',
        mode: 'lines',
        name: 'Pvap',
        line: { color: C.isDark ? '#c87ab8' : '#9333ea', width: 2.5 },
        fill: 'tozeroy',
        fillcolor: C.isDark ? 'rgba(200,122,184,0.07)' : 'rgba(147,51,234,0.06)',
      }]}
      layout={{
        height,
        margin: { l: 58, r: 16, t: 28, b: 46 },
        title: { text: 'Vapor Pressure', font: { color: C.textMuted, size: 11 }, x: 0 },
        paper_bgcolor: C.bg,
        plot_bgcolor:  C.surface,
        xaxis: {
          title: { text: 'Temperature (°C)', font: { color: C.textMuted, size: 10 } },
          color: C.textMuted,
          gridcolor: C.border,
          linecolor: C.borderMid,
          tickfont: { color: C.textSecondary, size: 10 },
          zeroline: false,
        },
        yaxis: {
          title: { text: 'Pvap (kPa)', font: { color: C.textMuted, size: 10 } },
          color: C.textMuted,
          gridcolor: C.border,
          linecolor: C.borderMid,
          tickfont: { color: C.textSecondary, size: 10 },
          zeroline: false,
        },
        font: { family: 'JetBrains Mono, ui-monospace, monospace', size: 10, color: C.textSecondary },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
    />
  )
}
