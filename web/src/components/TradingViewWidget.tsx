'use client';

import { useEffect, useRef } from 'react';

interface Props {
  symbol: string;  // e.g. "BMFBOVESPA:PETR4" or "PETR4"
  height?: number;
  theme?: 'dark' | 'light';
}

function formatSymbol(ticker: string): string {
  // If already has exchange prefix, use as-is
  if (ticker.includes(':')) return ticker;
  // Crypto pairs
  if (/^(BTC|ETH|SOL|ADA|DOT|DOGE|XRP)(USD|BRL|EUR|BTC)$/.test(ticker)) return `BINANCE:${ticker}`;
  // Brazilian tickers → BMFBOVESPA prefix
  if (/^[A-Z]{4}\d{1,2}$/.test(ticker)) return `BMFBOVESPA:${ticker}`;
  // US tickers
  return `NASDAQ:${ticker}`;
}

export default function TradingViewWidget({ symbol, height = 400, theme = 'dark' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: formatSymbol(symbol),
      interval: 'D',
      timezone: 'America/Sao_Paulo',
      theme: theme,
      style: '1',
      locale: 'br',
      backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0)' : 'rgba(255, 255, 255, 0)',
      gridColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.06)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, theme]);

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="tradingview-widget-container"
        ref={containerRef}
        style={{
          height,
          width: '100%',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
        }}
      />
    </div>
  );
}
