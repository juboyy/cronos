'use client';

import { useState, useEffect, useMemo } from 'react';

/* ── types ── */
interface Impact {
  id: string;
  ticker: string;
  impact_score: number;
  confidence: number;
  sentiment_score: number;
  delta_1d: number | null;
  delta_5d: number | null;
  volume_ratio: number;
  volume_anomaly: boolean;
  created_at: string;
  cronos_articles?: { title: string; source: string; published_at: string; url?: string };
}

interface Pattern {
  id: string;
  ticker: string;
  pattern_type: string;
  description: string;
  avg_impact: number;
  std_dev: number;
  occurrences: number;
  avg_confidence: number;
  last_seen: string;
}

interface Correlation {
  id: string;
  entity_value: string;
  entity_type: string;
  source_count: number;
  avg_sentiment: number;
  signal_strength: number;
  created_at: string;
}

/* ── styles ── */
const S = {
  label: { fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  mono: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' as const },
  card: { background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: '16px' },
  badge: (color: string) => ({ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color, border: `1px solid ${color}33`, borderRadius: 'var(--radius-sm)', padding: '2px 6px', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }),
};

function sentimentColor(s: number) {
  if (s > 0.2) return 'var(--signal-up)';
  if (s < -0.2) return 'var(--signal-down)';
  return 'var(--text-muted)';
}

function deltaDisplay(d: number | null) {
  if (d == null) return '—';
  const color = d > 0 ? 'var(--signal-up)' : d < 0 ? 'var(--signal-down)' : 'var(--text-muted)';
  return <span style={{ color, ...S.mono, fontSize: '0.75rem' }}>{d > 0 ? '+' : ''}{d.toFixed(2)}%</span>;
}

/* ── Tab: Correlações ── */
function CorrelationsTab({ data, loading }: { data: Correlation[]; loading: boolean }) {
  if (loading) return <p style={{ ...S.mono, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Carregando correlações...</p>;
  if (!data.length) return (
    <div style={{ ...S.card, textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
      <p style={{ ...S.mono, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Nenhuma correlação detectada ainda.</p>
      <p style={{ ...S.mono, color: 'var(--text-muted)', fontSize: '0.625rem', marginTop: '4px' }}>O crawler precisa processar mais artigos para gerar sinais.</p>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {data.map(c => (
        <div key={c.id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ ...S.mono, fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>{c.entity_value}</div>
            <div style={{ ...S.mono, fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: '2px' }}>{c.entity_type} · {c.source_count} fontes</div>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...S.label }}>Sentimento</div>
              <div style={{ ...S.mono, fontSize: '0.875rem', color: sentimentColor(c.avg_sentiment) }}>{c.avg_sentiment > 0 ? '+' : ''}{c.avg_sentiment.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...S.label }}>Sinal</div>
              <div style={{ ...S.mono, fontSize: '0.875rem', color: 'var(--accent)' }}>{(c.signal_strength * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Impacto ── */
function ImpactTab({ data, loading }: { data: Impact[]; loading: boolean }) {
  if (loading) return <p style={{ ...S.mono, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Carregando impactos...</p>;
  if (!data.length) return (
    <div style={{ ...S.card, textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📉</div>
      <p style={{ ...S.mono, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Nenhum impacto registrado ainda.</p>
      <p style={{ ...S.mono, color: 'var(--text-muted)', fontSize: '0.625rem', marginTop: '4px' }}>Dados de impacto surgem quando artigos são correlacionados com preços.</p>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {data.map(imp => (
        <div key={imp.id} style={{ ...S.card }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ ...S.mono, fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 700 }}>{imp.ticker}</span>
              {imp.volume_anomaly && <span style={S.badge('#eab308')}> vol anomalia</span>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...S.label }}>Impact Score</div>
              <div style={{ ...S.mono, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>{imp.impact_score.toFixed(2)}</div>
            </div>
          </div>
          {imp.cronos_articles && (
            <div style={{ ...S.mono, fontSize: '0.6875rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>
              {imp.cronos_articles.title}
              <span style={{ color: 'var(--text-muted)' }}> — {imp.cronos_articles.source}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '24px' }}>
            <div><span style={S.label}>Δ 1d </span>{deltaDisplay(imp.delta_1d)}</div>
            <div><span style={S.label}>Δ 5d </span>{deltaDisplay(imp.delta_5d)}</div>
            <div><span style={S.label}>Vol </span><span style={{ ...S.mono, fontSize: '0.75rem', color: imp.volume_ratio > 1.5 ? '#eab308' : 'var(--text-secondary)' }}>{imp.volume_ratio.toFixed(1)}x</span></div>
            <div><span style={S.label}>Conf </span><span style={{ ...S.mono, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{(imp.confidence * 100).toFixed(0)}%</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Padrões ── */
function PatternsTab({ data, loading }: { data: Pattern[]; loading: boolean }) {
  if (loading) return <p style={{ ...S.mono, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Carregando padrões...</p>;
  if (!data.length) return (
    <div style={{ ...S.card, textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔬</div>
      <p style={{ ...S.mono, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Nenhum padrão identificado ainda.</p>
      <p style={{ ...S.mono, color: 'var(--text-muted)', fontSize: '0.625rem', marginTop: '4px' }}>O sistema precisa de mais dados para detectar padrões recorrentes.</p>
    </div>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
      {data.map(p => (
        <div key={p.id} style={{ ...S.card }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ ...S.mono, fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 700 }}>{p.ticker}</span>
            <span style={S.badge('var(--text-tertiary)')}>{p.pattern_type}</span>
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 10px' }}>{p.description}</p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div><span style={S.label}>Impacto Médio </span><span style={{ ...S.mono, fontSize: '0.75rem', color: p.avg_impact > 0 ? 'var(--signal-up)' : 'var(--signal-down)' }}>{p.avg_impact > 0 ? '+' : ''}{p.avg_impact.toFixed(2)}%</span></div>
            <div><span style={S.label}>Ocorrências </span><span style={{ ...S.mono, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.occurrences}</span></div>
            <div><span style={S.label}>Confiança </span><span style={{ ...S.mono, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{(p.avg_confidence * 100).toFixed(0)}%</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ── */
type Tab = 'correlations' | 'impact' | 'patterns';

export default function AnalysisPage() {
  const [tab, setTab] = useState<Tab>('correlations');
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState({ correlations: true, impacts: true, patterns: true });

  useEffect(() => {
    fetch('/api/cronos/correlations').then(r => r.json()).then(d => {
      setCorrelations(Array.isArray(d) ? d : []);
      setLoading(p => ({ ...p, correlations: false }));
    }).catch(() => setLoading(p => ({ ...p, correlations: false })));

    fetch('/api/cronos/impact?limit=30').then(r => r.json()).then(d => {
      setImpacts(Array.isArray(d) ? d : []);
      setLoading(p => ({ ...p, impacts: false }));
    }).catch(() => setLoading(p => ({ ...p, impacts: false })));

    fetch('/api/cronos/patterns?limit=20').then(r => r.json()).then(d => {
      setPatterns(Array.isArray(d) ? d : []);
      setLoading(p => ({ ...p, patterns: false }));
    }).catch(() => setLoading(p => ({ ...p, patterns: false })));
  }, []);

  const tabs: { key: Tab; label: string; count: number }[] = useMemo(() => [
    { key: 'correlations', label: 'Correlações', count: correlations.length },
    { key: 'impact', label: 'Impacto', count: impacts.length },
    { key: 'patterns', label: 'Padrões', count: patterns.length },
  ], [correlations, impacts, patterns]);

  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px clamp(16px, 3vw, 40px)' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
          Análise
        </h1>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: '6px 0 0' }}>
          Correlações, impacto de mercado e padrões detectados pelo Cronos.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '10px 16px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              transition: 'color 150ms',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5rem',
                background: tab === t.key ? 'var(--accent)' : 'var(--border-subtle)',
                color: tab === t.key ? '#000' : 'var(--text-muted)',
                borderRadius: '8px',
                padding: '1px 6px',
                fontWeight: 700,
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'correlations' && <CorrelationsTab data={correlations} loading={loading.correlations} />}
      {tab === 'impact' && <ImpactTab data={impacts} loading={loading.impacts} />}
      {tab === 'patterns' && <PatternsTab data={patterns} loading={loading.patterns} />}
    </main>
  );
}
