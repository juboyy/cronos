'use client';

const NAV = [
  { href: '/', label: 'Intelligence' },
  { href: '/briefing', label: 'Briefing' },
  { href: '/impact', label: 'Impact' },
  { href: '/simulate', label: 'Simulate' },
  { href: '/patterns', label: 'Patterns' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/search', label: 'Search' },
];

export function NavBar() {
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
            live
          </span>
        </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                color: 'var(--text-tertiary)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '6px 12px',
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
        </nav>
      </div>
    </header>
  );
}
