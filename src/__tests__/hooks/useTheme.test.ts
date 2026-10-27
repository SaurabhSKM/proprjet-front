import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '@/hooks/useTheme'

const KEY = 'proprjet-theme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.classList.remove('theme-transitioning')
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.classList.remove('theme-transitioning')
})

describe('useTheme', () => {
  it('defaults to dark when no localStorage entry and no system preference', () => {
    // jsdom does not implement matchMedia — window.matchMedia returns null by default
    // The hook falls back to dark if matchMedia is unavailable or returns false
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    })

    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('reads stored theme from localStorage on mount', () => {
    localStorage.setItem(KEY, 'light')

    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })

  it('applies data-theme attribute on mount', () => {
    localStorage.setItem(KEY, 'light')

    renderHook(() => useTheme())
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('toggle switches from dark to light immediately', () => {
    localStorage.setItem(KEY, 'dark')
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.toggle()
    })

    expect(result.current.theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('toggle switches from light to dark immediately', () => {
    localStorage.setItem(KEY, 'light')
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.toggle()
    })

    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('persists new theme to localStorage after toggle', () => {
    localStorage.setItem(KEY, 'dark')
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.toggle()
    })

    expect(localStorage.getItem(KEY)).toBe('light')
  })

  it('adds theme-transitioning class on toggle', () => {
    localStorage.setItem(KEY, 'dark')
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.toggle()
    })

    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(true)
  })

  it('removes theme-transitioning class after ~400ms', () => {
    localStorage.setItem(KEY, 'dark')
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.toggle()
    })

    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(true)

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(false)
  })
})
