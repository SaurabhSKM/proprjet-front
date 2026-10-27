import { useAuth } from '@/app/auth/services/useAuth'
import IfpenLogo from '@/assets/ifpen_logo.svg'

/*
 * Molecular network: three fused aromatic rings (anthracene-like) + alkane chains.
 * Flat-top hexagons, center spacing = r*√3 ≈ 80px, r = 46.
 *
 * Ring A center (150,320), Ring B (230,320), Ring C (310,320)
 *
 * Vertices are computed as:
 *   angle 270° → top    (cx, cy-r)
 *   angle 330° → upper-right (cx+r*cos330, cy+r*sin330)
 *   ...etc
 */

const MoleculeNetwork = () => (
  <svg
    viewBox="0 0 500 600"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    className="float-slow"
    aria-hidden
  >
    {/* ── Bonds ────────────────────────────────────────────────────── */}
    <g stroke="var(--border-mid)" strokeWidth="1.6" strokeLinecap="round" opacity="0.85">
      {/* Ring A: (110,297)-(150,274)-(190,297)-(190,343)-(150,366)-(110,343) */}
      <line x1="110" y1="297" x2="150" y2="274"/>
      <line x1="150" y1="274" x2="190" y2="297"/>
      <line x1="190" y1="297" x2="190" y2="343"/>
      <line x1="190" y1="343" x2="150" y2="366"/>
      <line x1="150" y1="366" x2="110" y2="343"/>
      <line x1="110" y1="343" x2="110" y2="297"/>
      {/* Ring B: (230,274)-(270,297)-(270,343)-(230,366) + shared A2-A3 */}
      <line x1="190" y1="297" x2="230" y2="274"/>
      <line x1="230" y1="274" x2="270" y2="297"/>
      <line x1="270" y1="297" x2="270" y2="343"/>
      <line x1="270" y1="343" x2="230" y2="366"/>
      <line x1="230" y1="366" x2="190" y2="343"/>
      {/* Ring C: (310,274)-(350,297)-(350,343)-(310,366) + shared B2-B3 */}
      <line x1="270" y1="297" x2="310" y2="274"/>
      <line x1="310" y1="274" x2="350" y2="297"/>
      <line x1="350" y1="297" x2="350" y2="343"/>
      <line x1="350" y1="343" x2="310" y2="366"/>
      <line x1="310" y1="366" x2="270" y2="343"/>
      {/* Lower alkane chain (zigzag from ring bottoms) */}
      <line x1="150" y1="366" x2="190" y2="401"/>
      <line x1="190" y1="401" x2="230" y2="366"/>
      <line x1="230" y1="366" x2="270" y2="401"/>
      <line x1="270" y1="401" x2="310" y2="366"/>
      <line x1="310" y1="366" x2="350" y2="401"/>
      <line x1="350" y1="401" x2="390" y2="366"/>
      <line x1="390" y1="366" x2="430" y2="401"/>
      <line x1="430" y1="401" x2="470" y2="366"/>
      {/* Upper chain from Ring A top */}
      <line x1="150" y1="274" x2="110" y2="239"/>
      <line x1="110" y1="239" x2="150" y2="204"/>
      <line x1="150" y1="204" x2="110" y2="169"/>
      <line x1="110" y1="169" x2="150" y2="134"/>
      {/* Upper chain from Ring B top */}
      <line x1="230" y1="274" x2="230" y2="239"/>
      <line x1="230" y1="239" x2="270" y2="204"/>
      <line x1="270" y1="204" x2="230" y2="169"/>
      {/* Upper chain from Ring C top */}
      <line x1="310" y1="274" x2="350" y2="239"/>
      <line x1="350" y1="239" x2="390" y2="204"/>
      <line x1="390" y1="204" x2="430" y2="169"/>
      {/* Left extension */}
      <line x1="110" y1="297" x2="70" y2="274"/>
      <line x1="70"  y1="274" x2="30"  y2="297"/>
      <line x1="110" y1="343" x2="70"  y2="366"/>
      <line x1="70"  y1="366" x2="30"  y2="343"/>
      {/* Right extension from Ring C */}
      <line x1="350" y1="297" x2="390" y2="274"/>
      <line x1="390" y1="274" x2="430" y2="297"/>
    </g>

    {/* ── Aromatic pi-bond circles (dashed inner ring) ──────────────── */}
    <circle cx="150" cy="320" r="23" fill="none" stroke="var(--accent)" strokeWidth="0.9" strokeDasharray="3.5 2.5" opacity="0.4"/>
    <circle cx="230" cy="320" r="23" fill="none" stroke="var(--accent)" strokeWidth="0.9" strokeDasharray="3.5 2.5" opacity="0.4"/>
    <circle cx="310" cy="320" r="23" fill="none" stroke="var(--accent)" strokeWidth="0.9" strokeDasharray="3.5 2.5" opacity="0.4"/>

    {/* ── Nodes (ring atoms — larger, accent border) ────────────────── */}
    <g fill="var(--bg-base)" strokeWidth="1.8">
      <circle cx="110" cy="297" r="5" stroke="var(--accent)"/>
      <circle cx="150" cy="274" r="5" stroke="var(--accent)"/>
      <circle cx="190" cy="297" r="5" stroke="var(--accent)"/>
      <circle cx="190" cy="343" r="5" stroke="var(--accent)"/>
      <circle cx="150" cy="366" r="5" stroke="var(--accent)"/>
      <circle cx="110" cy="343" r="5" stroke="var(--accent)"/>
      <circle cx="230" cy="274" r="5" stroke="var(--border-hi)"/>
      <circle cx="270" cy="297" r="5" stroke="var(--border-hi)"/>
      <circle cx="270" cy="343" r="5" stroke="var(--border-hi)"/>
      <circle cx="230" cy="366" r="5" stroke="var(--border-hi)"/>
      <circle cx="310" cy="274" r="5" stroke="var(--accent)"/>
      <circle cx="350" cy="297" r="5" stroke="var(--accent)"/>
      <circle cx="350" cy="343" r="5" stroke="var(--accent)"/>
      <circle cx="310" cy="366" r="5" stroke="var(--accent)"/>
    </g>

    {/* ── Chain nodes (smaller, subtle) ─────────────────────────────── */}
    <g fill="var(--bg-base)" strokeWidth="1.2" stroke="var(--border-mid)">
      <circle cx="190" cy="401" r="3.5"/>
      <circle cx="270" cy="401" r="3.5"/>
      <circle cx="350" cy="401" r="3.5"/>
      <circle cx="390" cy="366" r="3.5"/>
      <circle cx="430" cy="401" r="3.5"/>
      <circle cx="470" cy="366" r="3.5"/>
      <circle cx="110" cy="239" r="3.5"/>
      <circle cx="150" cy="204" r="3.5"/>
      <circle cx="110" cy="169" r="3.5"/>
      <circle cx="150" cy="134" r="3.5"/>
      <circle cx="230" cy="239" r="3.5"/>
      <circle cx="270" cy="204" r="3.5"/>
      <circle cx="230" cy="169" r="3.5"/>
      <circle cx="350" cy="239" r="3.5"/>
      <circle cx="390" cy="204" r="3.5"/>
      <circle cx="430" cy="169" r="3.5"/>
      <circle cx="70"  cy="274" r="3.5"/>
      <circle cx="30"  cy="297" r="3.5"/>
      <circle cx="70"  cy="366" r="3.5"/>
      <circle cx="30"  cy="343" r="3.5"/>
      <circle cx="390" cy="274" r="3.5"/>
      <circle cx="430" cy="297" r="3.5"/>
    </g>

    {/* ── Formula labels ────────────────────────────────────────────── */}
    <g
      fill="var(--text-muted)"
      fontSize="7.5"
      fontFamily="'JetBrains Mono', ui-monospace, monospace"
      opacity="0.65"
      textAnchor="middle"
    >
      <text x="150" y="318">C₆H₅</text>
      <text x="230" y="318">C₆H₄</text>
      <text x="310" y="318">C₆H₅</text>
      <text x="308" y="422">n-C₁₂H₂₆</text>
      <text x="150" y="122">iso-C₈</text>
      <text x="400" y="157">C₁₅H₃₂</text>
    </g>
  </svg>
)

const LoginPage = () => {
  const { login } = useAuth()

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)',
    }}>
      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div
        className="login-panel-enter"
        style={{
          width: 400,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '52px 56px',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Vertical accent bar */}
        <div style={{
          position: 'absolute', left: 0, top: '18%', bottom: '18%',
          width: 2,
          background: `linear-gradient(to bottom, transparent, var(--accent) 30%, var(--accent) 70%, transparent)`,
          opacity: 0.5,
        }} />

        {/* IFPEN logo */}
        <div style={{ marginBottom: 48 }}>
          <img
            src={IfpenLogo}
            alt="IFPEN"
            className="logo-adaptive"
            style={{ height: 26 }}
          />
        </div>

        {/* Category label */}
        <div style={{
          fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase',
          color: 'var(--accent)', marginBottom: 10, fontWeight: 600,
        }}>
          Fuel Property Database
        </div>

        {/* Display heading */}
        <h1 style={{
          fontFamily: "'DM Serif Display', Georgia, 'Times New Roman', serif",
          fontSize: 40,
          fontWeight: 400,
          color: 'var(--text-primary)',
          margin: '0 0 16px',
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
        }}>
          Proprjet
        </h1>

        <p style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          margin: '0 0 40px',
          lineHeight: 1.75,
          maxWidth: 280,
        }}>
          Blend optimizer &amp; molecular property prediction for alternative aviation fuels.
          Sign in with your institutional account.
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 28 }} />

        {/* Sign-in button */}
        <button
          onClick={login}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '13px 24px',
            background: 'var(--accent)',
            color: 'var(--text-inverse)',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            fontFamily: 'inherit',
            letterSpacing: '0.02em',
            transition: 'background 150ms, transform 80ms, box-shadow 150ms',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.background = 'var(--accent-hover)'
            b.style.transform = 'translateY(-1px)'
            b.style.boxShadow = '0 4px 16px var(--accent-glow)'
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.background = 'var(--accent)'
            b.style.transform = 'translateY(0)'
            b.style.boxShadow = 'none'
          }}
        >
          {/* Keycloak key icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7.5" cy="15.5" r="5.5"/>
            <path d="M21 2l-9.6 9.6"/>
            <path d="M15.5 7.5l3 3L22 7l-3-3"/>
          </svg>
          Sign in with Keycloak
        </button>

        <p style={{
          marginTop: 20,
          fontSize: 11,
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}>
          Access restricted to IFPEN personnel
        </p>

        {/* Footer */}
        <div style={{
          position: 'absolute',
          bottom: 24, left: 56, right: 56,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            v0.2.0
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            IFP Énergies nouvelles
          </span>
        </div>
      </div>

      {/* ── Right panel — molecular network ────────────────────────── */}
      <div
        className="network-reveal"
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-base)',
        }}
      >
        {/* Depth gradients */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse at 35% 45%, var(--accent-glow) 0%, transparent 55%),
            radial-gradient(ellipse at 72% 72%, var(--success-glow) 0%, transparent 45%),
            radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.06) 0%, transparent 40%)
          `,
        }} />

        {/* Edge vignette from left (blends into the panel) */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to right, var(--bg-base) 0%, transparent 18%)',
        }} />

        {/* Molecular network */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: 0.55,
        }}>
          <MoleculeNetwork />
        </div>

        {/* Bottom-right label */}
        <div style={{
          position: 'absolute', bottom: 28, right: 36,
          textAlign: 'right',
        }}>
          <div style={{
            fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase',
            color: 'var(--text-muted)', opacity: 0.6,
          }}>
            Alternative Aviation Fuel Research
          </div>
        </div>

        {/* Top-right label */}
        <div style={{
          position: 'absolute', top: 28, right: 36,
          fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'var(--text-muted)', opacity: 0.5,
        }}>
          GCxGC · EOS · Linear Models
        </div>
      </div>
    </div>
  )
}

export default LoginPage
