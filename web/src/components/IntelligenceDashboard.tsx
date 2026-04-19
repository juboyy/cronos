'use client';

import { useState } from 'react';

interface Correlation {
  id: string;
  entity_value: string;
  entity_type: string;
  source_count: number;
  sources: any;
  avg_sentiment: number;
  sentiment_consensus: number;
  signal_strength: number;
  window_start: string;
  window_end: string;
  created_at: string;
}

interface Cluster {
  id: string;
  cluster_type: string;
  title: string;
  article_ids: any;
  entity_ids: any;
  sources: any;
  article_count: number;
  avg_sentiment: number;
  dominant_sentiment: string;
  window_minutes: number;
  window_start: string;
  window_end: string;
  keywords: any;
  created_at: string;
}

interface Briefing {
  id: string;
  date: string;
  summary: string;
  top_entities: any;
  top_correlations: any;
  top_clusters: any;
  market_mood: number;
  article_count: number;
  source_breakdown: any;
  alerts_fired: number;
}

interface Props {
  correlations: Correlation[];
  clusters: Cluster[];
  briefings: Briefing[];
}

function parseJSON(val: any): any {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val || [];
}

function SignalBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value > 3 ? 'var(--red)' : value > 1.5 ? 'var(--accent)' : 'var(--text-muted)';
  return (
    <div style={{ width: '100%', height: '4px', background: 'var(--bg-hover)', borderRadius: '2px' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.3s' }} />
    </div>
  );
}

function SentimentDot({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const color = value > 0.05 ? '#22c55e' : value < -0.05 ? '#ef4444' : 'var(--text-muted)';
  const label = value > 0.05 ? '▲' : value < -0.05 ? '▼' : '●';
  return <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{label} {value.toFixed(3)}</span>;
}

function TimeAgo({ ts }: { ts: string }) {
  if (!ts) return <span>—</span>;
  const d = new Date(ts);
  const now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  let label = '';
  if (mins < 60) label = `${mins}m atrás`;
  else if (mins < 1440) label = `${Math.floor(mins / 60)}h atrás`;
  else label = `${Math.floor(mins / 1440)}d atrás`;
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
      {label}
    </span>
  );
}

function CorrelationCard({ c }: { c: Correlation }) {
  const [expanded, setExpanded] = useState(false);
  const sources = parseJSON(c.sources);

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        padding: '16px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        transition: 'border-color 150ms',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-dim)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {c.entity_value}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.5625rem',
            padding: '1px 6px',
            borderRadius: '3px',
            background: 'var(--bg-hover)',
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
          }}>
            {c.entity_type}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--accent)',
          }}>
            {c.source_count} fontes
          </span>
          <TimeAgo ts={c.created_at} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            SINAL {c.signal_strength.toFixed(2)}
          </div>
          <SignalBar value={c.signal_strength} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', marginBottom: '2px' }}>CONSENSO</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {(c.sentiment_consensus * 100).toFixed(0)}%
          </span>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', marginBottom: '2px' }}>SENTIMENTO</div>
          <SentimentDot value={c.avg_sentiment} />
        </div>
      </div>

      {expanded && sources.length > 0 && (
        <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          {sources.map((s: any, i: number) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 0',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              color: 'var(--text-tertiary)',
            }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--accent-dim)', marginRight: '6px' }}>{s.source}</span>
                {s.title}
              </span>
              <SentimentDot value={s.sentiment} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClusterCard({ c }: { c: Cluster }) {
  const keywords = parseJSON(c.keywords);
  const sources = parseJSON(c.sources);
  const typeColors: Record<string, string> = {
    burst: '#ef4444',
    emerging: '#f59e0b',
    sustained: '#3b82f6',
  };
  const typeLabels: Record<string, string> = {
    burst: '⚡ BURST',
    emerging: '🌱 EMERGENTE',
    sustained: '📊 SUSTENTADO',
  };

  return (
    <div style={{
      padding: '16px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius)',
      borderLeft: `3px solid ${typeColors[c.cluster_type] || 'var(--border-subtle)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.5625rem',
            color: typeColors[c.cluster_type] || 'var(--text-muted)',
            letterSpacing: '0.06em',
            display: 'block',
            marginBottom: '4px',
          }}>
            {typeLabels[c.cluster_type] || c.cluster_type.toUpperCase()}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'var(--text-primary)',
          }}>
            {c.title}
          </span>
        </div>
        <TimeAgo ts={c.created_at} />
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
          {c.article_count} artigos
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
          {c.window_minutes / 60}h janela
        </span>
        <SentimentDot value={c.avg_sentiment} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          {sources.join(' · ')}
        </span>
      </div>

      {keywords.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {keywords.map((k: string, i: number) => (
            <span key={i} style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5625rem',
              padding: '1px 6px',
              borderRadius: '3px',
              background: 'var(--bg-hover)',
              color: 'var(--text-muted)',
            }}>
              {k}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BriefingCard({ b }: { b: Briefing }) {
  const mood = b.market_mood;
  const moodColor = mood > 0.05 ? '#22c55e' : mood < -0.05 ? '#ef4444' : 'var(--text-muted)';
  const moodLabel = mood > 0.05 ? 'OTIMISTA' : mood < -0.05 ? 'PESSIMISTA' : 'NEUTRO';
  const topEnts = parseJSON(b.top_entities);
  const breakdown = parseJSON(b.source_breakdown);

  return (
    <div style={{
      padding: '20px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          📋 {b.date}
        </span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
            {b.article_count} artigos
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.625rem',
            padding: '2px 8px',
            borderRadius: '3px',
            color: moodColor,
            border: `1px solid ${moodColor}33`,
            letterSpacing: '0.06em',
          }}>
            {moodLabel} {mood.toFixed(3)}
          </span>
        </div>
      </div>

      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        marginBottom: '12px',
      }}>
        {b.summary}
      </div>

      {topEnts.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            TOP ENTIDADES
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
            {topEnts.slice(0, 6).map((e: any, i: number) => (
              <span key={i} style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                padding: '2px 8px',
                borderRadius: '3px',
                background: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
              }}>
                {e.entity} <span style={{ color: 'var(--text-muted)' }}>×{e.mentions}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {Object.keys(breakdown).length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '10px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            FONTES
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
            {Object.entries(breakdown).sort((a: any, b: any) => b[1] - a[1]).map(([src, cnt]: any, i) => (
              <span key={i} style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.625rem',
                color: 'var(--text-muted)',
              }}>
                {src}:{cnt}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function IntelligenceDashboard({ correlations, clusters, briefings }: Props) {
  const [tab, setTab] = useState<'correlations' | 'clusters' | 'briefings'>('correlations');

  const tabs = [
    { key: 'correlations' as const, label: 'Correlações', count: correlations.length },
    { key: 'clusters' as const, label: 'Clusters', count: clusters.length },
    { key: 'briefings' as const, label: 'Briefings', count: briefings.length },
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(16px, 3vw, 40px)' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.75rem',
          color: 'var(--text-primary)',
          letterSpacing: '-0.03em',
          marginBottom: '4px',
        }}>
          Intelligence
        </h1>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6875rem',
          color: 'var(--text-muted)',
        }}>
          Correlações cross-source · clusters temporais · briefings automáticos
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '8px 16px',
              cursor: 'pointer',
              letterSpacing: '0.02em',
              transition: 'color 150ms',
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span style={{
                marginLeft: '6px',
                fontSize: '0.5625rem',
                padding: '1px 5px',
                borderRadius: '3px',
                background: tab === t.key ? 'var(--accent-dim)' : 'var(--bg-hover)',
                color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'correlations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {correlations.length === 0 ? (
            <div style={{
              padding: '40px', textAlign: 'center',
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}>
              Nenhuma correlação detectada ainda. O pipeline roda a cada 30min.
            </div>
          ) : (
            correlations.map((c) => <CorrelationCard key={c.id} c={c} />)
          )}
        </div>
      )}

      {tab === 'clusters' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {clusters.length === 0 ? (
            <div style={{
              padding: '40px', textAlign: 'center',
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}>
              Nenhum cluster temporal detectado. Precisa de mais dados.
            </div>
          ) : (
            clusters.map((c) => <ClusterCard key={c.id} c={c} />)
          )}
        </div>
      )}

      {tab === 'briefings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {briefings.length === 0 ? (
            <div style={{
              padding: '40px', textAlign: 'center',
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}>
              Nenhum briefing gerado ainda. O primeiro sai no próximo ciclo do pipeline.
            </div>
          ) : (
            briefings.map((b) => <BriefingCard key={b.id} b={b} />)
          )}
        </div>
      )}
    </div>
  );
}
