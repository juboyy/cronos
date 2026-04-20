'use client';

import { useState, useEffect } from 'react';

const MIROFISH_FRONTEND = 'https://mirofish.216-238-124-248.nip.io';
const MIROFISH_BACKEND = 'https://mirofish-api.216-238-124-248.nip.io';
const PROXY_URL = '/api/engines/mirofish';

interface EngineStatus {
  frontend: 'loading' | 'online' | 'offline';
  backend: 'loading' | 'online' | 'offline';
  simulations: number;
}

export default function MiroFishPage() {
  const [engine, setEngine] = useState<EngineStatus>({ frontend: 'loading', backend: 'loading', simulations: 0 });
  const [view, setView] = useState<'app' | 'status'>('app');

  const checkHealth = async () => {
    setEngine(prev => ({ ...prev, frontend: 'loading', backend: 'loading' }));
    const feOk = await fetch(MIROFISH_FRONTEND, { mode: 'no-cors', signal: AbortSignal.timeout(5000) })
      .then(() => true).catch(() => false);
    const proxyData = await fetch(PROXY_URL, { signal: AbortSignal.timeout(8000) })
      .then(r => r.ok ? r.json() : null).catch(() => null);
    setEngine({
      frontend: feOk ? 'online' : 'offline',
      backend: proxyData?.backend ?? 'offline',
      simulations: proxyData?.simulations ?? 0,
    });
  };

  useEffect(() => { checkHealth(); }, []);

  const status = engine.frontend === 'online' && engine.backend === 'online' ? 'online'
    : engine.frontend === 'loading' || engine.backend === 'loading' ? 'loading' : 'offline';

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
            { id: 'status' as const, label: 'Engine Status' },
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

      {/* Content */}
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
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', display: 'flex', gap: '16px' }}>
            <span>Frontend: {engine.frontend === 'online' ? '✅' : '❌'} {MIROFISH_FRONTEND}</span>
            <span>Backend: {engine.backend === 'online' ? '✅' : '❌'} {MIROFISH_BACKEND}</span>
          </div>
          <button
            onClick={checkHealth}
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
      ) : view === 'status' ? (
        <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', maxWidth: '900px' }}>
            {[
              { label: 'Frontend', url: MIROFISH_FRONTEND, status: engine.frontend },
              { label: 'Backend API', url: MIROFISH_BACKEND, status: engine.backend },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '20px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: s.status === 'online' ? '#22c55e' : '#ef4444' }}>
                    {s.status === 'online' ? '● ONLINE' : '● OFFLINE'}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-tertiary)', margin: 0, wordBreak: 'break-all' }}>{s.url}</p>
              </div>
            ))}
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '20px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Simulações</span>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', color: 'var(--accent)', margin: '8px 0 0' }}>{engine.simulations}</p>
            </div>
          </div>
          <div style={{ marginTop: '24px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>API Endpoints Disponíveis:</p>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                'GET  /health',
                'GET  /api/simulation/list',
                'POST /api/simulation/create',
                'POST /api/simulation/prepare',
                'POST /api/graph/build',
                'POST /api/graph/ontology/generate',
                'GET  /api/graph/project/list',
              ].map(ep => <span key={ep}>{ep}</span>)}
            </div>
          </div>
        </div>
      ) : (
        <iframe
          src={MIROFISH_FRONTEND}
          style={{
            flex: 1,
            border: 'none',
            width: '100%',
            background: '#0a0a0a',
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="MiroFish — Interface"
        />
      )}
    </div>
  );
}
