// src/components/layout/FullWidthLayout.tsx
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useTheme } from '@/hooks/useTheme'

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

interface FullWidthLayoutProps {
  children: ReactNode
  title: string
  backTo?: string
}

export default function FullWidthLayout({ children, title, backTo = '/substances' }: FullWidthLayoutProps) {
  const { theme, toggle } = useTheme()

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, Roboto, system-ui, sans-serif' }}
    >
      <header
        className="flex items-center flex-shrink-0"
        style={{ height: 44, padding: '0 16px', borderBottom: '1px solid var(--border)', background: 'var(--sidebar-bg)' }}
      >
        <Link
          to={backTo}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            textDecoration: 'none', color: 'var(--text-secondary)',
            fontSize: 12, fontWeight: 500, transition: 'color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <ArrowLeftIcon />
          Workspace
        </Link>

        <span style={{ margin: '0 10px', color: 'var(--border)' }}>/</span>

        <span
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 14,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </span>

        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: 5,
            color: 'var(--text-muted)', background: 'transparent',
            border: '1px solid var(--border)', cursor: 'pointer',
            transition: 'color 150ms, border-color 150ms, background 150ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--text-primary)'
            e.currentTarget.style.borderColor = 'var(--border-mid)'
            e.currentTarget.style.background = 'var(--bg-elevated)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}