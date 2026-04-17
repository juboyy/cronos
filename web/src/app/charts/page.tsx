'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const TradingViewWidget = dynamic(() => import('@/components/TradingViewWidget'), { ssr: false });

const POPULAR_TICKERS = [
  { symbol: 'PETR4', name: 'Petrobras PN' },
  { symbol: 'VALE3', name: 'Vale ON' },
  { symbol: 'ITUB4', name: 'Itaú Unibanco PN' },
  { symbol: 'BBDC4', name: 'Bradesco PN' },
  { symbol: 'WEGE3', name: 'WEG ON' },
  { symbol: 'ABEV3', name: 'Ambev ON' },
  { symbol: 'BBAS3', name: 'Banco do Brasil ON' },
  { symbol: 'RENT3', name: 'Localiza ON' },
  { symbol: 'MGLU3', name: 'Magazine Luiza ON' },
  { symbol: 'SUZB3', name: 'Suzano ON' },
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'BTCUSD', name: 'Bitcoin' },
  { symbol: 'ETHUSD', name: 'Ethereum' },
];

export default function ChartPage() {
  const [ticker, setTicker] = useState('PETR4');
  const [inputValue, setInputValue] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Gráficos
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.04em' }}>
            TradingView · dados em tempo real
          </p>
        </div>

        {/* Ticker input */}
        <form
          onSubmit={e => {
            e.preventDefault();
            if (inputValue.trim()) {
              setTicker(inputValue.trim().toUpperCase());
              setInputValue('');
            }
          }}
          style={{ display: 'flex', gap: '6px' }}
        >
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Ticker (ex: PETR4)"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              padding: '6px 12px',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              width: '140px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              padding: '6px 14px',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              cursor: 'pointer',
            }}
          >
            Abrir
          </button>
        </form>
      </div>

      {/* Quick select */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {POPULAR_TICKERS.map(t => (
          <button
            key={t.symbol}
            onClick={() => setTicker(t.symbol)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5625rem',
              padding: '4px 10px',
              border: '1px solid',
              borderColor: ticker === t.symbol ? 'var(--accent)' : 'var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              background: ticker === t.symbol ? 'var(--accent-dim)' : 'transparent',
              color: ticker === t.symbol ? 'var(--accent)' : 'var(--text-tertiary)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            {t.symbol}
          </button>
        ))}
      </div>

      {/* Main chart */}
      <TradingViewWidget symbol={ticker} height={520} />

      {/* Ticker info */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.5625rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        padding: '8px 0',
      }}>
        Dados fornecidos por TradingView · {ticker} · {/^[A-Z]{4}\d/.test(ticker) ? 'BMFBOVESPA' : /USD$/.test(ticker) ? 'CRYPTO' : 'NASDAQ'}
      </div>
    </div>
  );
}
