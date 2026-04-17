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
  const [mode, setMode] = useState<'cronos' | 'tradingview'>('cronos');

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--text-primary)' }}>
            Gráfico
          </h2>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
            {prices.length} pontos · {events.length} eventos
          </span>
        </div>

        <div style={{ display: 'flex', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <button
            onClick={() => setMode('cronos')}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5625rem',
              padding: '4px 10px',
              border: 'none',
              background: mode === 'cronos' ? 'var(--accent-dim)' : 'transparent',
              color: mode === 'cronos' ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              borderRight: '1px solid var(--border-subtle)',
            }}
          >
            Cronos Data
          </button>
          <button
            onClick={() => setMode('tradingview')}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5625rem',
              padding: '4px 10px',
              border: 'none',
              background: mode === 'tradingview' ? 'var(--accent-dim)' : 'transparent',
              color: mode === 'tradingview' ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            TradingView
          </button>
        </div>
      </div>

      {/* Chart */}
      {mode === 'cronos' ? (
        <TradingViewChart ticker={ticker} prices={prices} events={events} height={380} />
      ) : (
        <TradingViewWidget symbol={ticker} height={420} />
      )}
    </div>
  );
}
