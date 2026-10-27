import { useState, useEffect } from 'react'

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function resolve() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
  return {
    isDark,
    bg:            cssVar('--bg-base'),
    surface:       cssVar('--bg-surface'),
    border:        cssVar('--border'),
    borderMid:     cssVar('--border-mid'),
    textPrimary:   cssVar('--text-primary'),
    textSecondary: cssVar('--text-secondary'),
    textMuted:     cssVar('--text-muted'),
    accent:        cssVar('--accent'),
    accentMuted:   cssVar('--accent-muted'),
    success:       cssVar('--success'),
    warning:       cssVar('--warning'),
    danger:        cssVar('--danger'),
    // Colorscale for heatmaps — two distinct ramps per theme
    heatscale: isDark
      ? [
          [0,    '#0D1117'],
          [0.01, '#0C4A6E'],
          [0.12, '#075985'],
          [0.35, '#0369A1'],
          [0.65, '#0EA5E9'],
          [1.0,  '#BAE6FD'],
        ] as [number, string][]
      : [
          [0,    '#F4F7FB'],
          [0.01, '#D8EEF9'],
          [0.15, '#7DD3FC'],
          [0.4,  '#38BDF8'],
          [0.7,  '#0278C2'],
          [1.0,  '#013A70'],
        ] as [number, string][],
  }
}

export function useChartColors() {
  const [colors, setColors] = useState(resolve)

  useEffect(() => {
    // Re-read every CSS variable when data-theme attribute changes
    const obs = new MutationObserver(() => setColors(resolve()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  return colors
}
