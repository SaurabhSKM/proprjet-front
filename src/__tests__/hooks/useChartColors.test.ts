import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChartColors } from '@/hooks/useChartColors'

// jsdom does not resolve CSS variables, so getComputedStyle returns ''.
// We mock it to return predictable values so the hook result is testable.
const CSS_VARS: Record<string, string> = {
  '--bg-base':        '#0D1117',
  '--bg-surface':     '#161B22',
  '--border':         '#30363D',
  '--border-mid':     '#484F58',
  '--text-primary':   '#E6EDF3',
  '--text-secondary': '#8B949E',
  '--text-muted':     '#6E7681',
  '--accent':         '#0EA5E9',
  '--accent-muted':   '#075985',
  '--success':        '#3FB950',
  '--warning':        '#D29922',
  '--danger':         '#F85149',
}

let originalGetComputedStyle: typeof window.getComputedStyle

beforeEach(() => {
  originalGetComputedStyle = window.getComputedStyle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).getComputedStyle = (_el: Element) => ({
    getPropertyValue: (name: string) => CSS_VARS[name] ?? '',
  })
  // Default to dark theme
  document.documentElement.removeAttribute('data-theme')
})

afterEach(() => {
  window.getComputedStyle = originalGetComputedStyle
  document.documentElement.removeAttribute('data-theme')
})

describe('useChartColors', () => {
  it('resolves CSS variables on mount and returns non-empty strings', () => {
    const { result } = renderHook(() => useChartColors())

    expect(result.current.accent).toBe('#0EA5E9')
    expect(result.current.bg).toBe('#0D1117')
    expect(result.current.textPrimary).toBe('#E6EDF3')
    expect(result.current.danger).toBe('#F85149')
  })

  it('isDark is true when data-theme is not "light"', () => {
    document.documentElement.removeAttribute('data-theme')
    const { result } = renderHook(() => useChartColors())
    expect(result.current.isDark).toBe(true)
  })

  it('isDark is false when data-theme is "light"', () => {
    document.documentElement.setAttribute('data-theme', 'light')
    const { result } = renderHook(() => useChartColors())
    expect(result.current.isDark).toBe(false)
  })

  it('heatscale is an array of [number, string] pairs', () => {
    const { result } = renderHook(() => useChartColors())
    const { heatscale } = result.current

    expect(Array.isArray(heatscale)).toBe(true)
    expect(heatscale.length).toBeGreaterThan(0)

    for (const entry of heatscale) {
      expect(Array.isArray(entry)).toBe(true)
      expect(entry).toHaveLength(2)
      expect(typeof entry[0]).toBe('number')
      expect(typeof entry[1]).toBe('string')
    }
  })

  it('heatscale starts at 0 and ends at 1', () => {
    const { result } = renderHook(() => useChartColors())
    const { heatscale } = result.current

    expect(heatscale[0][0]).toBe(0)
    expect(heatscale[heatscale.length - 1][0]).toBe(1.0)
  })

  it('re-resolves when data-theme attribute changes', async () => {
    document.documentElement.removeAttribute('data-theme')
    const { result } = renderHook(() => useChartColors())

    expect(result.current.isDark).toBe(true)

    // MutationObserver fires as a microtask; use act + waitFor to flush it
    act(() => {
      document.documentElement.setAttribute('data-theme', 'light')
    })

    await waitFor(() => expect(result.current.isDark).toBe(false), { timeout: 2000 })
  })
})
