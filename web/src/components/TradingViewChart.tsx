'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  LineStyle,
  AreaSeries,
  HistogramSeries,
  createSeriesMarkers,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts';

interface PricePoint {
  date: string;
  close: number;
  volume?: number;
}

interface SentimentEvent {
  time: string;
  score: number;
  title: string;
}

interface Props {
  ticker: string;
  prices: PricePoint[];
  events?: SentimentEvent[];
  height?: number;
}

export default function TradingViewChart({ ticker, prices, events = [], height = 340 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('3M');

  useEffect(() => {
    if (!containerRef.current || prices.length < 2) return;

    // Clear previous
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(220 10% 45%)',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'hsl(220 10% 12%)' },
        horzLines: { color: 'hsl(220 10% 12%)' },
      },
      crosshair: {
        vertLine: { color: 'hsl(220 10% 25%)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: 'hsl(220 10% 10%)' },
        horzLine: { color: 'hsl(220 10% 25%)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: 'hsl(220 10% 10%)' },
      },
      rightPriceScale: {
        borderColor: 'hsl(220 10% 15%)',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: 'hsl(220 10% 15%)',
        timeVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    // Filter by timeframe
    const now = new Date();
    const cutoff = new Date();
    switch (timeframe) {
      case '1M': cutoff.setMonth(now.getMonth() - 1); break;
      case '3M': cutoff.setMonth(now.getMonth() - 3); break;
      case '6M': cutoff.setMonth(now.getMonth() - 6); break;
      case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
      case 'ALL': cutoff.setFullYear(2000); break;
    }

    const sorted = [...prices]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter(p => new Date(p.date) >= cutoff);

    if (sorted.length < 2) return;

    const first = sorted[0].close;
    const last = sorted[sorted.length - 1].close;
    const isUp = last >= first;
    const lineColor = isUp ? 'hsl(155 70% 45%)' : 'hsl(0 65% 50%)';
    const areaTop = isUp ? 'hsla(155, 70%, 45%, 0.15)' : 'hsla(0, 65%, 50%, 0.12)';
    const areaBottom = isUp ? 'hsla(155, 70%, 45%, 0)' : 'hsla(0, 65%, 50%, 0)';

    // v5 API: addSeries(AreaSeries, options)
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: areaTop,
      bottomColor: areaBottom,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: lineColor,
    });

    areaSeries.setData(
      sorted.map(p => ({
        time: p.date as unknown as UTCTimestamp,
        value: p.close,
      }))
    );

    // Volume histogram
    if (sorted.some(p => p.volume && p.volume > 0)) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: 'hsla(220, 30%, 50%, 0.2)',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });

      volumeSeries.setData(
        sorted
          .filter(p => p.volume && p.volume > 0)
          .map((p, i) => ({
            time: p.date as unknown as UTCTimestamp,
            value: p.volume!,
            color: p.close >= (sorted[Math.max(0, sorted.indexOf(p) - 1)]?.close ?? p.close)
              ? 'hsla(155, 60%, 45%, 0.25)'
              : 'hsla(0, 55%, 50%, 0.25)',
          }))
      );
    }

    // Sentiment markers (v5: createSeriesMarkers)
    if (events.length > 0) {
      const markers = events
        .filter(e => {
          const t = new Date(e.time);
          return t >= cutoff && t <= now;
        })
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
        .map(e => ({
          time: e.time.split('T')[0] as unknown as UTCTimestamp,
          position: (e.score > 0 ? 'aboveBar' : 'belowBar') as 'aboveBar' | 'belowBar',
          color: e.score > 0.1 ? 'hsl(155 70% 55%)' : e.score < -0.1 ? 'hsl(0 65% 55%)' : 'hsl(45 70% 55%)',
          shape: (e.score > 0.1 ? 'arrowUp' : e.score < -0.1 ? 'arrowDown' : 'circle') as 'arrowUp' | 'arrowDown' | 'circle',
          text: e.title.length > 40 ? e.title.slice(0, 37) + '…' : e.title,
        }));

      if (markers.length > 0) {
        createSeriesMarkers(areaSeries, markers);
      }
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [prices, events, timeframe, height]);

  const timeframes: Array<{ label: string; value: typeof timeframe }> = [
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
    { label: '1A', value: '1Y' },
    { label: 'Tudo', value: 'ALL' },
  ];

  if (prices.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem' }}>
        Dados insuficientes para {ticker}
      </div>
    );
  }

  return (
    <div>
      {/* Timeframe selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {ticker} · Histórico
        </span>
        <div style={{ display: 'flex', gap: '2px' }}>
          {timeframes.map(tf => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5625rem',
                padding: '3px 8px',
                border: '1px solid',
                borderColor: timeframe === tf.value ? 'var(--accent)' : 'var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                background: timeframe === tf.value ? 'var(--accent-dim)' : 'transparent',
                color: timeframe === tf.value ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      />
    </div>
  );
}
