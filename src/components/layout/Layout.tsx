// src/components/layout/Layout.tsx
import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/app/auth/services/useAuth'

const NAV = [
  { to: '/substances',      label: 'Substances',     icon: '⬡' },
  { to: '/classifications', label: 'Classifications', icon: '◈' },
  { to: '/models',          label: 'Models',          icon: '⬢' },
  { to: '/optimizer',       label: 'Optimizer',       icon: '◎' },
  { to: '/gcxgc',           label: 'GC×GC',           icon: '⊕' },
  { to: '/projects',        label: 'Projects',        icon: '◫' },
  { to: '/similarity',      label: 'Similarity',      icon: '◐' },
  { to: '/admin',           label: 'Admin',           icon: '⚙' },
]

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme()
  const auth = useAuth()
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, Roboto, system-ui, sans-serif' }}
    >
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className="w-[220px] flex-shrink-0 flex flex-col"
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo zone */}
        <div
          className="flex flex-col justify-center px-6"
          style={{ height: 56, borderBottom: '1px solid var(--border)' }}
        >
          <span
            className="uppercase tracking-[0.3em]"
            style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.3em' }}
          >
            IFPEN
          </span>
          <span
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: 17,
              fontWeight: 400,
              color: 'var(--text-primary)',
              marginTop: 2,
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            Proprjet
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-auto">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? 'nav-item-active' : 'nav-item'
              }
              style={({ isActive }) => isActive
                ? {
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 10px 10px 10px',
                    paddingLeft: 10,
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    borderLeft: '2px solid var(--accent)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    transition: 'all 150ms ease',
                  }
                : {
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 400,
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    transition: 'all 150ms ease',
                  }
              }
              onMouseEnter={e => {
                const el = e.currentTarget
                if (!el.classList.contains('nav-item-active')) {
                  el.style.color = 'var(--text-primary)'
                  el.style.background = 'var(--bg-elevated)'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                if (!el.classList.contains('nav-item-active')) {
                  el.style.color = 'var(--text-secondary)'
                  el.style.background = 'transparent'
                }
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>
                {icon}
              </span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User strip */}
        {auth.authenticated && (
          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {/* Avatar circle */}
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: 'var(--accent)',
            }}>
              {auth.username ? auth.username[0].toUpperCase() : '?'}
            </div>

            {/* Username + role */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {auth.username ?? '—'}
              </div>
              <div style={{ fontSize: 9, color: auth.isAdmin ? 'var(--accent)' : 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {auth.isAdmin ? 'admin' : 'user'}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={() => auth.logout()}
              title="Sign out"
              style={{
                background: 'none', border: '1px solid var(--border)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 10, color: 'var(--text-muted)', fontFamily: 'inherit',
                padding: '3px 7px', borderRadius: 4, flexShrink: 0,
                transition: 'color 150ms, border-color 150ms, background 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--danger)'
                e.currentTarget.style.borderColor = 'var(--danger)'
                e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'none'
              }}
            >
              <LogoutIcon />
              <span>Out</span>
            </button>
          </div>
        )}

        {/* Bottom zone */}
        <div
          className="px-3 py-3"
          style={{
            borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', paddingLeft: 7 }}>
            v0.2.0
          </span>
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="btn btn-icon"
            style={{
              color: 'var(--text-muted)',
              background: 'transparent',
              border: '1px solid var(--border)',
              transition: 'color 150ms, border-color 150ms, background 150ms',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget
              b.style.color = 'var(--text-primary)'
              b.style.borderColor = 'var(--border-mid)'
              b.style.background = 'var(--bg-elevated)'
            }}
            onMouseLeave={e => {
              const b = e.currentTarget
              b.style.color = 'var(--text-muted)'
              b.style.borderColor = 'var(--border)'
              b.style.background = 'transparent'
            }}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto" style={{ background: 'var(--bg-base)' }}>
        {children}
      </main>
    </div>
  )
}
