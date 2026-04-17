'use client';

import { useEffect, useRef } from 'react';

interface Props {
  symbols?: Array<{ proName: string; title: string }>;
}

const DEFAULT_SYMBOLS = [
  { proName: 'BMFBOVESPA:IBOV', title: 'Ibovespa' },
  { proName: 'BMFBOVESPA:PETR4', title: 'PETR4' },
  { proName: 'BMFBOVESPA:VALE3', title: 'VALE3' },
  { proName: 'BMFBOVESPA:ITUB4', title: 'ITUB4' },
  { proName: 'BMFBOVESPA:BBDC4', title: 'BBDC4' },
  { proName: 'BMFBOVESPA:WEGE3', title: 'WEGE3' },
  { proName: 'FX_IDC:USDBRL', title: 'USD/BRL' },
  { proName: 'ECONOMICS:BRINTR', title: 'SELIC' },
  { proName: 'TVC:DXY', title: 'DXY' },
  { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
];

export default function TickerTape({ symbols = DEFAULT_SYMBOLS }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols,
      showSymbolLogo: false,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: 'dark',
      locale: 'br',
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbols]);

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{
        width: '100%',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'hsl(225 15% 3.5% / 0.6)',
      }}
    />
  );
}
