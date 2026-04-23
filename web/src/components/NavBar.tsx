'use client';

import { useState } from 'react';
import { NotificationBell } from './NotificationBell';

const NAV = [
  { href: '/', label: 'Feed' },
  { href: '/intelligence', label: 'Intel' },
  { href: '/briefing', label: 'Briefing' },
  { href: '/impact', label: 'Impacto' },
  { href: '/search', label: 'Busca' },
  { href: '/simulate', label: 'Simular' },
  { href: '/patterns', label: 'Padrões' },
  { href: '/charts', label: 'Charts' },
  { href: '/bettafish', label: '🐟 Betta' },
  { href: '/mirofish', label: '🦈 Miro' },
  { href: '/alerts', label: 'Alertas' },
];

export function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid var(--border-subtle)',
        background: 'hsl(225 15% 3.5% / 0.92)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 clamp(16px, 3vw, 40px)',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.5rem',
              color: 'var(--text-primary)',
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            Cronos
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.625rem',
              color: 'var(--accent)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '2px 6px',
              border: '1px solid var(--accent-dim)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            2.0
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.625rem',
                color: 'var(--text-tertiary)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '6px 10px',
                borderRadius: 'var(--radius)',
                transition: 'color 150ms, background 150ms',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.color = 'var(--text-primary)';
                (e.target as HTMLElement).style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.color = 'var(--text-tertiary)';
                (e.target as HTMLElement).style.background = 'transparent';
              }}
            >
              {n.label}
            </a>
          ))}
          <NotificationBell />
          <button
            onClick={async () => { await fetch('/api/auth', { method: 'DELETE' }); window.location.href = '/login'; }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5625rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'none',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              marginLeft: '8px',
            }}
          >
            Sair
          </button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setOpen(!open)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '1.25rem',
            cursor: 'pointer',
            padding: '4px',
          }}
          aria-label="Menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div
          className="mobile-nav"
          style={{
            display: 'none',
            flexDirection: 'column',
            padding: '8px clamp(16px, 3vw, 40px) 16px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'hsl(225 15% 3.5% / 0.98)',
          }}
        >
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '10px 0',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {n.label}
            </a>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .mobile-nav { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
