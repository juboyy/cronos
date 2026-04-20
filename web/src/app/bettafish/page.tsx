'use client';

import { useState, useEffect } from 'react';

const BETTAFISH_URL = 'https://bettafish.216-238-124-248.nip.io';
const STREAMLIT_URL = 'https://streamlit.216-238-124-248.nip.io';

const TABS = [
  { id: 'main', label: 'Painel Principal', url: BETTAFISH_URL },
  { id: 'insight', label: 'Insight Engine', url: `${STREAMLIT_URL}` },
  { id: 'media', label: 'Media Engine', url: `${STREAMLIT_URL.replace('streamlit', 'streamlit')}` },
  { id: 'query', label: 'Query Engine', url: `${STREAMLIT_URL.replace('streamlit', 'streamlit')}` },
];

export default function BettaFishPage() {
  const [activeTab, setActiveTab] = useState('main');
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading');

  const tab = TABS.find((t) => t.id === activeTab)!;
  const iframeUrl = tab.url;

  useEffect(() => {
    fetch(BETTAFISH_URL, { mode: 'no-cors', signal: AbortSignal.timeout(5000) })
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
          <span style={{ fontSize: '1.5rem' }}>🐟</span>
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
              BettaFish
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
              Multi-Agent Opinion Analysis Engine
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

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '2px' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
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
                background: activeTab === t.id ? 'var(--accent)' : 'transparent',
                color: activeTab === t.id ? '#000' : 'var(--text-tertiary)',
              }}
            >
              {t.label}
            </button>
          ))}
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
          <span style={{ fontSize: '3rem' }}>🐟</span>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            BettaFish engine está offline
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)' }}>
            Engine URL: {BETTAFISH_URL}
          </p>
          <button
            onClick={() => {
              setStatus('loading');
              fetch(BETTAFISH_URL, { mode: 'no-cors', signal: AbortSignal.timeout(5000) })
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
          key={activeTab}
          src={iframeUrl}
          style={{
            flex: 1,
            border: 'none',
            width: '100%',
            background: '#0a0a0a',
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title={`BettaFish — ${tab.label}`}
        />
      )}
    </div>
  );
}
