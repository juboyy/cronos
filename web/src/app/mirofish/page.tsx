'use client';

import { useState, useEffect } from 'react';

const MIROFISH_FRONTEND = 'https://mirofish.216-238-124-248.nip.io';
const MIROFISH_BACKEND = 'https://mirofish-api.216-238-124-248.nip.io';

export default function MiroFishPage() {
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  const [view, setView] = useState<'app' | 'api'>('app');

  useEffect(() => {
    fetch(MIROFISH_FRONTEND, { mode: 'no-cors', signal: AbortSignal.timeout(5000) })
      .then(() => setStatus('online'))
      .catch(() => setStatus('offline'));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <div
        style={{
          padding: '20px clamp(16px, 3vw, 40px)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.5rem' }}>🦈</span>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.25rem',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              MiroFish
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.625rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
                margin: 0,
              }}
            >
              Swarm Intelligence Prediction Engine — Predict Anything
            </p>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5625rem',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              background: status === 'online' ? 'rgba(34, 197, 94, 0.15)' : status === 'offline' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(250, 204, 21, 0.15)',
              color: status === 'online' ? '#22c55e' : status === 'offline' ? '#ef4444' : '#facc15',
              border: `1px solid ${status === 'online' ? 'rgba(34, 197, 94, 0.3)' : status === 'offline' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(250, 204, 21, 0.3)'}`,
            }}
          >
            {status === 'online' ? '● ONLINE' : status === 'offline' ? '● OFFLINE' : '● CHECKING'}
          </span>
        </div>

        {/* View switcher */}
        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '2px' }}>
          {[
            { id: 'app' as const, label: 'Interface Completa' },
            { id: 'api' as const, label: 'API Backend' },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5625rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms',
                background: view === v.id ? 'var(--accent)' : 'transparent',
                color: view === v.id ? '#000' : 'var(--text-tertiary)',
              }}
            >
              {v.label}
            </button>
          ))}
          <a
            href={MIROFISH_FRONTEND}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5625rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-tertiary)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ↗ Abrir Separado
          </a>
        </div>
      </div>

      {/* Engine iframe */}
      {status === 'offline' ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            color: 'var(--text-muted)',
          }}
        >
          <span style={{ fontSize: '3rem' }}>🦈</span>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            MiroFish engine está offline
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)' }}>
            Frontend: {MIROFISH_FRONTEND} | Backend: {MIROFISH_BACKEND}
          </p>
          <button
            onClick={() => {
              setStatus('loading');
              fetch(MIROFISH_FRONTEND, { mode: 'no-cors', signal: AbortSignal.timeout(5000) })
                .then(() => setStatus('online'))
                .catch(() => setStatus('offline'));
            }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.625rem',
              padding: '8px 16px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <iframe
          key={view}
          src={view === 'app' ? MIROFISH_FRONTEND : MIROFISH_BACKEND}
          style={{
            flex: 1,
            border: 'none',
            width: '100%',
            background: '#0a0a0a',
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title={`MiroFish — ${view === 'app' ? 'Interface' : 'API'}`}
        />
      )}
    </div>
  );
}
