'use client';

import { useState, useEffect } from 'react';

const BETTAFISH_URL = 'https://bettafish.216-238-124-248.nip.io';
const STREAMLIT_URL = 'https://streamlit.216-238-124-248.nip.io';

const TABS = [
  { id: 'main', label: 'Painel Principal', url: BETTAFISH_URL, description: 'Interface central para análise multi-agente de sentimentos e tendências.' },
  { id: 'insight', label: 'Insight Engine', url: `${BETTAFISH_URL}/?engine=insight`, description: 'Extração de insights estratégicos e sinais de mercado a partir de dados não estruturados.' },
  { id: 'media', label: 'Media Engine', url: `${BETTAFISH_URL}/?engine=media`, description: 'Monitoramento em tempo real de redes sociais, notícias e sentimento da mídia.' },
  { id: 'query', label: 'Query Engine', url: `${BETTAFISH_URL}/?engine=query`, description: 'Interface de busca semântica profunda para exploração da base de conhecimento.' },
  { id: 'forum', label: 'Forum', url: `${BETTAFISH_URL}/?engine=forum`, description: 'Análise de discussões em comunidades financeiras e fóruns especializados.' },
];

export default function BettaFishPage() {
  const [activeTab, setActiveTab] = useState('main');
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading');

  const tab = TABS.find((t) => t.id === activeTab)!;
  const iframeUrl = tab.url;

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(BETTAFISH_URL, { signal: AbortSignal.timeout(5000) });
        if (res.ok || res.status === 401 || res.status === 403) {
          setStatus('online');
        } else {
          setStatus('offline');
        }
      } catch (e) {
        setStatus('offline');
      }
    };
    checkStatus();
  }, []);

  const startEngines = async () => {
    try {
      await fetch(`${BETTAFISH_URL}/api/system/start`, { method: 'POST' });
      alert('Comando de inicialização enviado.');
      setStatus('loading');
      setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
      alert('Falha ao enviar comando de inicialização.');
    }
  };

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

      {/* Engine View */}
      {status === 'offline' ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            color: 'var(--text-muted)',
            padding: '40px',
            textAlign: 'center'
          }}
        >
          <span style={{ fontSize: '3rem' }}>🐟</span>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
              BettaFish Engine is Offline
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)' }}>
              Last Check: {new Date().toLocaleTimeString()} • URL: {BETTAFISH_URL}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', width: '100%', maxWidth: '800px' }}>
             {TABS.map(t => (
               <div key={t.id} style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>{t.label}</span>
                    <span style={{ fontSize: '0.5rem', color: '#ef4444' }}>● DOWN</span>
                  </div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{t.description}</p>
               </div>
             ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                setStatus('loading');
                window.location.reload();
              }}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.625rem',
                padding: '10px 20px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              Retry Connection
            </button>
            <button
              onClick={startEngines}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.625rem',
                padding: '10px 20px',
                borderRadius: 'var(--radius)',
                border: 'none',
                background: 'var(--accent)',
                color: '#000',
                cursor: 'pointer',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
            >
              Start Engines
            </button>
          </div>
        </div>
      ) : activeTab === 'main' ? (
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
      ) : (
        <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
            <div style={{ maxWidth: '600px', textAlign: 'center' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '12px' }}>{tab.label}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{tab.description}</p>
                <div style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.625rem', color: '#22c55e', fontFamily: 'var(--font-mono)' }}>STATUS: OPERATIONAL</span>
                    <div style={{ height: '12px', width: '1px', background: 'var(--border-subtle)' }} />
                    <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>VERSION: 2.4.0-BETA</span>
                </div>
            </div>
            
            <iframe
                key={activeTab}
                src={iframeUrl}
                style={{
                    width: '100%',
                    height: '500px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius)',
                    background: '#0a0a0a',
                }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title={`BettaFish — ${tab.label}`}
            />
        </div>
      )}
    </div>
  );
}
}
