import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
const KEY = 'proprjet-theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(KEY)
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(KEY, theme)
  }, [theme])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    // Apply immediately so CSS variables change in the same frame as the transition class
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem(KEY, next)
    // Attach broad transition class so *every* element animates uniformly
    document.documentElement.classList.add('theme-transitioning')
    setTheme(next)
    window.setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning')
    }, 400)
  }

  return { theme, toggle }
}
