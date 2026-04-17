'use client';

import { useState } from 'react';

interface Article {
  id: string;
  title: string;
  source: string;
  url: string;
  summary?: string;
  published_at?: string;
}

interface AnalysisResult {
  perspectives?: {
    bull?: string;
    bear?: string;
    quant?: string;
    macro?: string;
  };
  key_insights?: string[];
  risk_factors?: string[];
  opportunities?: string[];
  error?: string;
}

interface ArticleAnalysisProps {
  article: Article;
}

export function ArticleAnalysis({ article }: ArticleAnalysisProps) {
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

  return (
    <div onClick={(e) => e.preventDefault()}>
      <button
        onClick={analyze}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.5625rem',
          color: open ? 'var(--accent)' : 'var(--text-muted)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          background: open ? 'var(--accent-bg)' : 'transparent',
          border: '1px solid',
          borderColor: open ? 'var(--accent-dim)' : 'var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '3px 8px',
          cursor: 'pointer',
          transition: 'all 150ms ease',
          whiteSpace: 'nowrap',
        }}
      >
        {loading ? '◈' : open ? '▾ BettaFish' : '▸ Analisar'}
      </button>

      {open && (
        <div
          style={{
            marginTop: '10px',
            padding: '14px 16px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderLeft: '2px solid var(--accent-dim)',
            borderRadius: 'var(--radius)',
          }}
        >
          {loading && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                color: 'var(--text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span className="pulse">◈</span>
              <span>Consultando BettaFish...</span>
            </div>
          )}

          {result?.error && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                color: 'var(--signal-down)',
              }}
            >
              {result.error}
            </div>
          )}

          {result && !result.error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Perspectives */}
              {result.perspectives && (
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.5625rem',
                      color: 'var(--text-muted)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    Perspectivas
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '6px',
                    }}
                  >
                    {Object.entries(result.perspectives).map(([key, val]) => {
                      const colors: Record<string, string> = {
                        bull: 'var(--signal-up)',
                        bear: 'var(--signal-down)',
                        quant: 'var(--signal-info)',
                        macro: 'var(--signal-neutral)',
                      };
                      return (
                        <div
                          key={key}
                          style={{
                            padding: '8px 10px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.5rem',
                              color: colors[key] || 'var(--text-tertiary)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              marginBottom: '4px',
                            }}
                          >
                            {key}
                          </div>
                          <div
                            style={{
                              fontSize: '0.6875rem',
                              color: 'var(--text-secondary)',
                              lineHeight: 1.4,
                            }}
                          >
                            {val}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Key Insights */}
              {result.key_insights && result.key_insights.length > 0 && (
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.5625rem',
                      color: 'var(--text-muted)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: '6px',
                    }}
                  >
                    Insights
                  </div>
                  <ul style={{ paddingLeft: '12px', margin: 0 }}>
                    {result.key_insights.map((ins, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                          marginBottom: '2px',
                        }}
                      >
                        {ins}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risk + Opportunities row */}
              {((result.risk_factors && result.risk_factors.length > 0) ||
                (result.opportunities && result.opportunities.length > 0)) && (
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}
                >
                  {result.risk_factors && result.risk_factors.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.5625rem',
                          color: 'var(--signal-down)',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          marginBottom: '4px',
                        }}
                      >
                        Riscos
                      </div>
                      <ul style={{ paddingLeft: '12px', margin: 0 }}>
                        {result.risk_factors.map((r, i) => (
                          <li
                            key={i}
                            style={{
                              fontSize: '0.6875rem',
                              color: 'var(--text-tertiary)',
                              lineHeight: 1.4,
                              marginBottom: '2px',
                            }}
                          >
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.opportunities && result.opportunities.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.5625rem',
                          color: 'var(--signal-up)',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          marginBottom: '4px',
                        }}
                      >
                        Oportunidades
                      </div>
                      <ul style={{ paddingLeft: '12px', margin: 0 }}>
                        {result.opportunities.map((o, i) => (
                          <li
                            key={i}
                            style={{
                              fontSize: '0.6875rem',
                              color: 'var(--text-tertiary)',
                              lineHeight: 1.4,
                              marginBottom: '2px',
                            }}
                          >
                            {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
