'use client';

import { useState, useRef, useEffect } from 'react';

interface ArticleData {
  published_at: string;
  sentiment?: number;
  title?: string;
  source?: string;
  url?: string;
}

interface DayData {
  date: string;
  count: number;
  avgSentiment: number;
  articles: { title: string; source: string; sentiment: number; url?: string }[];
}

export function SentimentHeatmap({ articles }: { articles: ArticleData[] }) {
  const [tooltip, setTooltip] = useState<{ day: DayData; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close tooltip on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTooltip(null);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Build 90-day grid
  const today = new Date();
  const days: DayData[] = [];
  const dayMap: Record<string, { count: number; sentSum: number; articles: { title: string; source: string; sentiment: number; url?: string }[] }> = {};

  for (const a of articles) {
    if (!a.published_at) continue;
    const d = a.published_at.slice(0, 10);
    if (!dayMap[d]) dayMap[d] = { count: 0, sentSum: 0, articles: [] };
    dayMap[d].count++;
    dayMap[d].sentSum += a.sentiment ?? 0;
    dayMap[d].articles.push({
      title: a.title || 'Sem título',
      source: a.source || '?',
      sentiment: a.sentiment ?? 0,
      url: a.url,
    });
  }

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = dayMap[key];
    days.push({
      date: key,
      count: entry?.count ?? 0,
      avgSentiment: entry ? entry.sentSum / entry.count : 0,
      articles: entry?.articles ?? [],
    });
  }

  // Grid: 7 rows (days) x N cols (weeks)
  const weeks: (DayData | null)[][] = [];
  const startDayOfWeek = new Date(days[0].date).getDay();
  const padded: (DayData | null)[] = [...Array(startDayOfWeek).fill(null), ...days];

  for (let w = 0; w < Math.ceil(padded.length / 7); w++) {
    weeks.push(padded.slice(w * 7, (w + 1) * 7));
  }

  const maxCount = Math.max(...days.map(d => d.count), 1);
  const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  function cellColor(d: DayData | null): string {
    if (!d || d.count === 0) return 'var(--border-subtle)';
    const s = d.avgSentiment;
    if (s > 0.1) return `hsl(155 ${Math.min(70, 30 + s * 100)}% ${40 + Math.min(d.count / maxCount, 1) * 15}%)`;
    if (s < -0.1) return `hsl(0 ${Math.min(70, 30 + Math.abs(s) * 100)}% ${40 + Math.min(d.count / maxCount, 1) * 15}%)`;
    return `hsl(45 ${20 + Math.min(d.count / maxCount, 1) * 30}% ${35 + Math.min(d.count / maxCount, 1) * 15}%)`;
  }

  function cellOpacity(d: DayData | null): number {
    if (!d || d.count === 0) return 0.15;
    return 0.3 + Math.min(d.count / maxCount, 1) * 0.7;
  }

  const S = {
    label: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  };

  // Month labels
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    const firstDay = weeks[w].find(d => d != null);
    if (firstDay) {
      const m = new Date(firstDay.date).getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ label: new Date(firstDay.date).toLocaleDateString('pt-BR', { month: 'short' }), col: w });
        lastMonth = m;
      }
    }
  }

  function sentDot(s: number) {
    const hue = s > 0.05 ? 155 : s < -0.05 ? 0 : 45;
    return `hsl(${hue} 60% 50%)`;
  }

  return (
    <section ref={containerRef} style={{ position: 'relative' }}>
      <style>{`
        .heatmap-cell {
          transition: transform 150ms, box-shadow 150ms;
          cursor: pointer;
        }
        .heatmap-cell:hover {
          transform: scale(1.8);
          z-index: 10;
          box-shadow: 0 0 8px rgba(0,0,0,0.5);
        }
        .heatmap-tooltip {
          position: fixed;
          z-index: 100;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 12px 14px;
          min-width: 240px;
          max-width: 320px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          pointer-events: auto;
          animation: tooltipIn 0.15s ease;
        }
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .heatmap-tooltip-article {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 4px 0;
          border-bottom: 1px solid var(--border-subtle);
        }
        .heatmap-tooltip-article:last-child {
          border-bottom: none;
        }
        .heatmap-tooltip-article a {
          font-size: 0.6875rem;
          color: var(--text-secondary);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .heatmap-tooltip-article a:hover {
          color: var(--text-primary);
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '14px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Cobertura
        </h2>
        <span style={{ ...S.label }}>{articles.length} artigos · {Object.keys(dayMap).length} dias ativos</span>
      </div>

      {/* Month labels */}
      <div style={{ display: 'flex', gap: '1px', marginLeft: '20px', marginBottom: '4px' }}>
        {weeks.map((_, w) => {
          const ml = monthLabels.find(m => m.col === w);
          return (
            <div key={w} style={{ width: '11px', textAlign: 'left' }}>
              {ml && <span style={{ ...S.label, fontSize: '0.4375rem', whiteSpace: 'nowrap' }}>{ml.label}</span>}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '2px' }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', paddingTop: '0' }}>
          {dayLabels.map((label, i) => (
            <div key={i} style={{ height: '11px', width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4px' }}>
              {i % 2 === 1 && <span style={{ ...S.label, fontSize: '0.375rem', lineHeight: 1 }}>{label}</span>}
            </div>
          ))}
        </div>

        {/* Grid */}
        {weeks.map((week, w) => (
          <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {Array.from({ length: 7 }).map((_, d) => {
              const day = week[d] ?? null;
              return (
                <div
                  key={d}
                  className="heatmap-cell"
                  onClick={(e) => {
                    if (day && day.count > 0) {
                      setTooltip({ day, x: e.clientX, y: e.clientY });
                    }
                  }}
                  style={{
                    width: '11px',
                    height: '11px',
                    borderRadius: '2px',
                    background: cellColor(day),
                    opacity: cellOpacity(day),
                    position: 'relative',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="heatmap-tooltip"
          style={{
            left: Math.min(tooltip.x + 12, typeof window !== 'undefined' ? window.innerWidth - 340 : 600),
            top: Math.min(tooltip.y - 20, typeof window !== 'undefined' ? window.innerHeight - 300 : 400),
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
              {new Date(tooltip.day.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </span>
            <span style={{ ...S.label, color: tooltip.day.avgSentiment > 0.05 ? 'var(--signal-up)' : tooltip.day.avgSentiment < -0.05 ? 'var(--signal-down)' : 'var(--signal-neutral)' }}>
              sent: {tooltip.day.avgSentiment.toFixed(2)}
            </span>
          </div>
          <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
            {tooltip.day.count} artigo{tooltip.day.count !== 1 ? 's' : ''}
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {tooltip.day.articles.slice(0, 8).map((art, i) => (
              <div key={i} className="heatmap-tooltip-article">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sentDot(art.sentiment), flexShrink: 0, marginTop: '5px' }} />
                <div style={{ minWidth: 0 }}>
                  {art.url ? (
                    <a href={art.url} target="_blank" rel="noopener">{art.title}</a>
                  ) : (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{art.title}</span>
                  )}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {art.source} · {art.sentiment > 0 ? '+' : ''}{art.sentiment.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
            {tooltip.day.articles.length > 8 && (
              <div style={{ ...S.label, textAlign: 'center', padding: '4px 0', color: 'var(--text-muted)' }}>
                +{tooltip.day.articles.length - 8} mais
              </div>
            )}
          </div>
          <button
            onClick={() => setTooltip(null)}
            style={{ position: 'absolute', top: '6px', right: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '10px', marginLeft: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ ...S.label, fontSize: '0.4375rem' }}>Sentimento:</span>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          <span style={{ ...S.label, fontSize: '0.375rem' }}>neg</span>
          {[-0.5, -0.2, 0, 0.2, 0.5].map((s, i) => (
            <div key={i} style={{
              width: '10px', height: '10px', borderRadius: '2px',
              background: s > 0.1 ? `hsl(155 50% 45%)` : s < -0.1 ? `hsl(0 50% 45%)` : `hsl(45 30% 40%)`,
              opacity: 0.4 + Math.abs(s) * 1.2,
            }} />
          ))}
          <span style={{ ...S.label, fontSize: '0.375rem' }}>pos</span>
        </div>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          <span style={{ ...S.label, fontSize: '0.375rem' }}>vol:</span>
          {[0.15, 0.4, 0.7, 1].map((o, i) => (
            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--text-muted)', opacity: o }} />
          ))}
        </div>
        <span style={{ ...S.label, fontSize: '0.375rem', color: 'var(--text-muted)' }}>clique na célula para detalhes</span>
      </div>
    </section>
  );
}
