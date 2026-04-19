'use client';

import { useState } from 'react';

interface Perspective {
  analysis: string;
  confidence: number;
  stance: string;
  tickers: string[];
}

interface Synthesis {
  sentiment: string;
  action: string;
  takeaway: string;
  risk: string;
  confidence: number;
}

interface AnalysisResult {
  perspectives?: Record<string, Perspective>;
  synthesis?: Synthesis;
  source?: string;
  error?: string;
}

interface ArticleAnalysisProps {
  article: {
    id: string;
    title: string;
    source: string;
    url: string;
    summary?: string;
  };
  compact?: boolean;
}

const STANCE_COLORS: Record<string, string> = {
  bullish: 'var(--signal-up, #22c55e)',
  bearish: 'var(--signal-down, #ef4444)',
  neutral: 'var(--signal-neutral, #eab308)',
  positive: 'var(--signal-up, #22c55e)',
  negative: 'var(--signal-down, #ef4444)',
};

const ROLE_LABELS: Record<string, string> = {
  bull: '🐂 Bull',
  bear: '🐻 Bear',
  quant: '📊 Quant',
  macro: '🌍 Macro',
  sector: '🏭 Setor',
  risk: '⚠️ Risco',
};

const VERDICT_COLORS: Record<string, string> = {
  COMPRA: 'var(--signal-up, #22c55e)',
  VENDA: 'var(--signal-down, #ef4444)',
  NEUTRO: 'var(--signal-neutral, #eab308)',
  positive: 'var(--signal-up, #22c55e)',
  negative: 'var(--signal-down, #ef4444)',
  neutral: 'var(--signal-neutral, #eab308)',
};

export function ArticleAnalysis({ article, compact }: ArticleAnalysisProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function analyze(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (result) {
      setOpen((o) => !o);
      return;
    }

    setLoading(true);
    setOpen(true);

    try {
      const res = await fetch('/api/cronos/opinion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: article.summary || '',
          entities: [],
          market_context: `Fonte: ${article.source}`,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: 'Falha ao obter análise' });
    } finally {
      setLoading(false);
    }
  }

  const S = {
    label: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.06em', textTransform: 'uppercase' as const },
    mono: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' as const },
  };

  const synthesis = result?.synthesis;
  const verdictLabel = synthesis?.action || synthesis?.sentiment || '';
  const verdictColor = VERDICT_COLORS[verdictLabel] || VERDICT_COLORS[synthesis?.sentiment || ''] || 'var(--text-muted)';

  return (
    <div onClick={(e) => e.preventDefault()}>
      <button
        onClick={analyze}
        style={{
          ...S.mono,
          fontSize: '0.5625rem',
          color: open ? 'var(--accent)' : 'var(--text-muted)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          background: open ? 'var(--accent-bg, rgba(59,130,246,0.08))' : 'transparent',
          border: '1px solid',
          borderColor: open ? 'var(--accent-dim, #3b82f6)' : 'var(--border-subtle, #333)',
          borderRadius: 'var(--radius-sm, 4px)',
          padding: '3px 8px',
          cursor: 'pointer',
          transition: 'all 150ms ease',
          whiteSpace: 'nowrap',
        }}
      >
        {loading ? '◈ Analisando...' : open ? '▾ BettaFish' : '▸ Analisar'}
      </button>

      {open && (
        <div
          style={{
            marginTop: '10px',
            padding: '14px 16px',
            background: 'var(--bg-elevated, #111)',
            border: '1px solid var(--border, #222)',
            borderLeft: '2px solid var(--accent-dim, #3b82f6)',
            borderRadius: 'var(--radius, 6px)',
          }}
        >
          {loading && (
            <div style={{ ...S.mono, fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="pulse">◈</span>
              <span>Consultando BettaFish...</span>
            </div>
          )}

          {result?.error && (
            <div style={{ ...S.mono, fontSize: '0.6875rem', color: 'var(--signal-down, #ef4444)' }}>
              {result.error}
            </div>
          )}

          {result && !result.error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Synthesis verdict bar */}
              {synthesis && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '8px 12px',
                  background: 'var(--bg-surface, #0a0a0a)',
                  border: '1px solid var(--border-subtle, #222)',
                  borderRadius: 'var(--radius-sm, 4px)',
                }}>
                  <span style={{
                    ...S.mono, fontSize: '0.875rem', fontWeight: 600,
                    color: verdictColor,
                  }}>
                    {verdictLabel.toUpperCase()}
                  </span>
                  {synthesis.takeaway && (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', flex: 1 }}>
                      {synthesis.takeaway}
                    </span>
                  )}
                  <span style={{
                    ...S.label, fontSize: '0.5rem',
                    color: synthesis.risk === 'high' || synthesis.risk === 'alto'
                      ? 'var(--signal-down)' : synthesis.risk === 'low' || synthesis.risk === 'baixo'
                      ? 'var(--signal-up)' : 'var(--signal-neutral)',
                  }}>
                    Risco: {synthesis.risk}
                  </span>
                </div>
              )}

              {/* Perspectives grid */}
              {result.perspectives && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '6px',
                }}>
                  {Object.entries(result.perspectives).map(([key, p]) => {
                    const color = STANCE_COLORS[p.stance] || 'var(--text-tertiary)';
                    const label = ROLE_LABELS[key] || key;
                    return (
                      <div key={key} style={{
                        padding: '10px 12px',
                        background: 'var(--bg-surface, #0a0a0a)',
                        border: '1px solid var(--border-subtle, #222)',
                        borderRadius: 'var(--radius-sm, 4px)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ ...S.label, color }}>{label}</span>
                          {p.confidence > 0 && (
                            <span style={{ ...S.mono, fontSize: '0.5rem', color: 'var(--text-muted)' }}>
                              {Math.round(p.confidence * 100)}%
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '0.6875rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                          maxHeight: compact ? '60px' : '120px',
                          overflow: 'hidden',
                        }}>
                          {p.analysis}
                        </div>
                        {p.tickers?.length > 0 && (
                          <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {p.tickers.map(t => (
                              <span key={t} style={{
                                ...S.mono, fontSize: '0.5rem',
                                padding: '1px 4px',
                                background: 'var(--accent-bg, rgba(59,130,246,0.1))',
                                borderRadius: '2px',
                                color: 'var(--accent, #3b82f6)',
                              }}>{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Source tag */}
              <div style={{ ...S.mono, fontSize: '0.5rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                via {result.source || 'bettafish'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
