'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ── Types ── */
interface Entity {
  id: string;
  type: string;
  value: string;
  canonical_name?: string;
  sector?: string;
  relevance?: number;
  context?: string;
}

interface Sentiment {
  score: number;
  label: string;
  provider?: string;
}

interface Impact {
  ticker: string;
  impact_score: number;
  delta_1d?: number;
  volume_anomaly?: boolean;
}

interface RelatedArticle {
  id: string;
  title: string;
  source: string;
  published_at?: string;
  url: string;
}

interface GraphNode {
  id: string;
  type: string;
  label: string;
  group: string;
  sector?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  label?: string;
}

interface ArticleData {
  article: {
    id: string;
    title: string;
    source: string;
    summary?: string;
    content?: string;
    published_at?: string;
    url: string;
  };
  entities: Entity[];
  sentiments: Sentiment[];
  impacts: Impact[];
  relatedArticles: RelatedArticle[];
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  transmissionChain: any[];
}

/* ── Helpers ── */
const S = {
  label: { fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)' },
  mono: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' as const },
};

function sentimentColor(score: number) {
  if (score > 0.05) return 'var(--signal-up)';
  if (score < -0.05) return 'var(--signal-down)';
  return 'var(--signal-neutral)';
}

function sentimentLabel(score: number) {
  if (score > 0.3) return 'Muito Positivo';
  if (score > 0.05) return 'Positivo';
  if (score < -0.3) return 'Muito Negativo';
  if (score < -0.05) return 'Negativo';
  return 'Neutro';
}

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const typeEmoji: Record<string, string> = {
  ticker: '📊', company: '🏢', person: '👤', sector: '🏭', institution: '🏛️', country: '🌍', commodity: '⛏️',
};

/* ── Entity Graph (pure SVG, no deps) ── */
function EntityGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 560, H = 340;

  if (nodes.length < 2) return null;

  // Simple force-layout positioning (deterministic, single pass)
  const cx = W / 2, cy = H / 2;
  const positioned = nodes.map((n, i) => {
    if (i === 0) return { ...n, x: cx, y: cy }; // article node center
    const angle = ((i - 1) / (nodes.length - 1)) * Math.PI * 2;
    const r = Math.min(W, H) * 0.35;
    return { ...n, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });

  const nodeMap = new Map(positioned.map(n => [n.id, n]));

  const groupColors: Record<string, string> = {
    article: 'var(--accent)', ticker: 'var(--signal-info)', company: 'hsl(280 50% 55%)',
    sector: 'hsl(45 70% 50%)', person: 'hsl(330 60% 55%)', institution: 'hsl(150 50% 45%)',
    country: 'hsl(200 60% 50%)', commodity: 'hsl(25 70% 50%)',
  };

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: '340px' }}>
      {/* Edges */}
      {edges.map((e, i) => {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (!s || !t) return null;
        return (
          <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
            stroke="var(--border)" strokeWidth={Math.max(e.weight * 2, 0.5)} strokeOpacity={0.5} />
        );
      })}
      {/* Nodes */}
      {positioned.map((n) => {
        const r = n.group === 'article' ? 18 : 10;
        const color = groupColors[n.group] || 'var(--text-muted)';
        return (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={r} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} />
            <text x={n.x} y={n.y + r + 12} textAnchor="middle" fill="var(--text-tertiary)"
              fontSize={n.group === 'article' ? 8 : 9} fontFamily="var(--font-mono)">
              {(n.label || '').slice(0, 20)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Main Modal ── */
export function ArticleModal({ articleId, onClose }: { articleId: string; onClose: () => void }) {
  const [data, setData] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/cronos/article/${articleId}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [articleId]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const sent = data?.sentiments?.[0];
  const score = sent?.score ?? 0;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="article-modal-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        padding: '40px 16px', overflowY: 'auto',
      }}
    >
      <div
        className="article-modal-content"
        style={{
          width: '100%', maxWidth: '780px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          animation: 'modalSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px',
        }}>
          <div style={{ flex: 1 }}>
            {loading ? (
              <div style={{ height: 24, width: '60%', background: 'var(--bg-hover)', borderRadius: 4 }} />
            ) : error ? (
              <div style={{ color: 'var(--signal-down)', ...S.mono, fontSize: '0.875rem' }}>Erro: {error}</div>
            ) : (
              <>
                <h2 style={{ fontSize: '1.125rem', lineHeight: 1.35, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  {data!.article.title}
                </h2>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ ...S.label, color: 'var(--accent)' }}>{data!.article.source}</span>
                  <span style={{ ...S.label }}>{formatDate(data!.article.published_at)}</span>
                  {sent && (
                    <span style={{ ...S.mono, fontSize: '0.6875rem', color: sentimentColor(score), fontWeight: 600 }}>
                      {sentimentLabel(score)} ({score > 0 ? '+' : ''}{score.toFixed(3)})
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)', padding: '6px 10px', cursor: 'pointer',
            color: 'var(--text-tertiary)', ...S.mono, fontSize: '0.75rem',
            flexShrink: 0,
          }}>
            ESC
          </button>
        </div>

        {!loading && !error && data && (
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* ── Summary ── */}
            {data.article.summary && (
              <section>
                <div style={{ ...S.label, marginBottom: '10px' }}>Resumo</div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {data.article.summary}
                </p>
              </section>
            )}

            {/* ── Entities ── */}
            {data.entities.length > 0 && (
              <section>
                <div style={{ ...S.label, marginBottom: '10px' }}>Entidades ({data.entities.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {data.entities.map(e => (
                    <span key={e.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)',
                      fontSize: '0.75rem', color: 'var(--text-primary)',
                    }}>
                      <span style={{ fontSize: '0.625rem' }}>{typeEmoji[e.type] || '◆'}</span>
                      {e.canonical_name || e.value}
                      {e.sector && <span style={{ ...S.label, fontSize: '0.5rem', color: 'var(--text-muted)' }}>({e.sector})</span>}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* ── Entity Graph ── */}
            {data.graph.nodes.length > 1 && (
              <section>
                <div style={{ ...S.label, marginBottom: '10px' }}>Grafo de Entidades</div>
                <div style={{
                  background: 'var(--bg)', border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius)', padding: '16px', overflow: 'hidden',
                }}>
                  <EntityGraph nodes={data.graph.nodes} edges={data.graph.edges} />
                </div>
              </section>
            )}

            {/* ── Transmission Chain ── */}
            {data.impacts.length > 0 && (
              <section>
                <div style={{ ...S.label, marginBottom: '10px' }}>Cadeia de Transmissão</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {data.impacts.map((imp, i) => {
                    const barW = Math.min(imp.impact_score * 100, 100);
                    return (
                      <div key={i} style={{
                        display: 'grid', gridTemplateColumns: '60px 1fr 50px 60px',
                        gap: '12px', alignItems: 'center',
                        padding: '8px 12px', background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
                      }}>
                        <span style={{ ...S.mono, fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {imp.ticker}
                        </span>
                        <div style={{ height: '4px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${barW}%`, height: '100%', borderRadius: '2px',
                            background: imp.impact_score > 0.6 ? 'var(--signal-down)' : imp.impact_score > 0.35 ? 'var(--signal-neutral)' : 'var(--accent)',
                          }} />
                        </div>
                        <span style={{ ...S.mono, fontSize: '0.625rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                          {imp.impact_score.toFixed(2)}
                        </span>
                        {imp.delta_1d != null && (
                          <span style={{
                            ...S.mono, fontSize: '0.625rem', textAlign: 'right',
                            color: imp.delta_1d > 0 ? 'var(--signal-up)' : imp.delta_1d < 0 ? 'var(--signal-down)' : 'var(--text-muted)',
                          }}>
                            {imp.delta_1d > 0 ? '+' : ''}{imp.delta_1d.toFixed(2)}%
                          </span>
                        )}
                        {imp.volume_anomaly && (
                          <span style={{ fontSize: '0.5rem', color: 'var(--signal-down)' }}>● vol</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Related Articles ── */}
            {data.relatedArticles.length > 0 && (
              <section>
                <div style={{ ...S.label, marginBottom: '10px' }}>Artigos Relacionados</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {data.relatedArticles.map(rel => (
                    <a key={rel.id} href={rel.url} target="_blank" rel="noopener"
                      className="interactive"
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 12px', borderRadius: 'var(--radius-sm)', gap: '12px',
                      }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', flex: 1 }}>
                        {rel.title}
                      </span>
                      <span style={{ ...S.label, fontSize: '0.5rem', flexShrink: 0 }}>{rel.source}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* ── Footer link ── */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a href={data.article.url} target="_blank" rel="noopener"
                style={{ ...S.mono, fontSize: '0.6875rem', color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                Abrir artigo original ↗
              </a>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ padding: '80px 28px', textAlign: 'center' }}>
            <span className="pulse" style={{ ...S.mono, fontSize: '0.875rem', color: 'var(--text-muted)' }}>◈ Carregando...</span>
          </div>
        )}
      </div>
    </div>
  );
}
