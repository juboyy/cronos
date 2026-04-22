'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const TradingViewChart = dynamic(() => import('@/components/TradingViewChart'), { ssr: false });
const TradingViewWidget = dynamic(() => import('@/components/TradingViewWidget'), { ssr: false });

interface Props {
  ticker: string;
  prices: Array<{ date: string; close: number; volume?: number }>;
  events: Array<{ time: string; score: number; title: string }>;
}

export default function EntityCharts({ ticker, prices, events }: Props) {
  const [showTVOverlay, setShowTVOverlay] = useState(false);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--text-primary)' }}>
            Gráfico
          </h2>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
            {prices.length} pontos · {events.length} eventos
          </span>
        </div>

        {/* TradingView expand button - discrete */}
        <button
          onClick={() => setShowTVOverlay(true)}
          title="Abrir gráfico avançado TradingView"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.5625rem',
            padding: '4px 10px',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <span style={{ fontSize: '0.625rem' }}>⛶</span>
          Avançado
        </button>
      </div>

      {/* Main chart - always Cronos Data with sentiment markers */}
      <TradingViewChart ticker={ticker} prices={prices} events={events} height={380} />

      {/* TradingView full-screen overlay */}
      {showTVOverlay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
          }}
          onClick={() => setShowTVOverlay(false)}
        >
          <div
            style={{
              flex: 1,
              maxWidth: '1400px',
              width: '100%',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Overlay header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '12px', padding: '0 4px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)' }}>
                  {ticker}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
                  TradingView · Análise Técnica Avançada
                </span>
              </div>
              <button
                onClick={() => setShowTVOverlay(false)}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                  padding: '6px 14px', border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)', background: 'transparent',
                  color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                ✕ Fechar
              </button>
            </div>

            {/* TradingView widget */}
            <div style={{
              flex: 1,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
            }}>
              <TradingViewWidget symbol={ticker} height={600} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
