'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Entity, 
  Sentiment, 
  Impact, 
  Article,
  RelatedArticle,
  GraphNode,
  GraphEdge
} from '@/lib/types';

interface ArticleData {
  article: Article;
  entities: Entity[];
  sentiments: Sentiment[];
  impacts: Impact[];
  relatedArticles: RelatedArticle[];
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  transmissionChain: { step: string; impact: string; confidence: number }[];
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

/* ── Entity Graph (Force-Directed) ── */
function EntityGraph({ nodes: initialNodes, edges: initialEdges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [hoveredEdge, setHoveredEdge] = useState<{ label: string; x: number; y: number } | null>(null);
  const dragRef = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);

  const W = 724; // responsive based on modal width - container width is preferred
  const H = 500;

  // Initialize simulation nodes
  useEffect(() => {
    const initializedNodes = initialNodes.map((n, i) => ({
      ...n,
      x: W / 2 + (Math.random() - 0.5) * 100,
      y: H / 2 + (Math.random() - 0.5) * 100,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    }));
    setNodes(initializedNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  useEffect(() => {
    if (nodes.length === 0) return;

    let animFrame: number;
    const strength = 0.05;
    const distance = 100;
    const charge = -400;
    const friction = 0.9;

    const tick = () => {
      setNodes(prevNodes => {
        const nextNodes = prevNodes.map(n => ({ ...n, vx: n.vx || 0, vy: n.vy || 0 }));
        const nodeMap = new Map(nextNodes.map(n => [n.id, n]));

        for (let i = 0; i < nextNodes.length; i++) {
          for (let j = i + 1; j < nextNodes.length; j++) {
            const ni = nextNodes[i];
            const nj = nextNodes[j];
            const dx = nj.x! - ni.x!;
            const dy = nj.y! - ni.y!;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);
            const force = charge / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            ni.vx! += fx;
            ni.vy! += fy;
            nj.vx! -= fx;
            nj.vy! -= fy;
          }
        }

        edges.forEach(edge => {
          const s = nodeMap.get(edge.source);
          const t = nodeMap.get(edge.target);
          if (!s || !t) return;
          const dx = t.x! - s.x!;
          const dy = t.y! - s.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - distance) * strength * edge.weight;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          s.vx! += fx;
          s.vy! += fy;
          t.vx! -= fx;
          t.vy! -= fy;
        });

        nextNodes.forEach(n => {
          const dx = W / 2 - n.x!;
          const dy = H / 2 - n.y!;
          n.vx! += dx * 0.01;
          n.vy! += dy * 0.01;
        });

        return nextNodes.map(n => {
          if (n.fx !== null && n.fx !== undefined) {
            return { ...n, x: n.fx, y: n.fy!, vx: 0, vy: 0 };
          }
          const vx = (n.vx! * friction);
          const vy = (n.vy! * friction);
          return {
            ...n,
            vx,
            vy,
            x: Math.max(20, Math.min(W - 20, n.x! + vx)),
            y: Math.max(20, Math.min(H - 20, n.y! + vy)),
          };
        });
      });
      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [edges, nodes.length]);

  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const CTM = svg.getScreenCTM();
    if (!CTM) return;
    const x = (e.clientX - CTM.e) / CTM.a;
    const y = (e.clientY - CTM.f) / CTM.d;

    const node = nodes.find(n => n.id === id);
    if (!node) return;

    dragRef.current = { nodeId: id, offsetX: node.x! - x, offsetY: node.y! - y };
    setNodes(prev => prev.map(n => n.id === id ? { ...n, fx: node.x, fy: node.y } : n));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const CTM = svg.getScreenCTM();
    if (!CTM) return;
    const x = (e.clientX - CTM.e) / CTM.a;
    const y = (e.clientY - CTM.f) / CTM.d;

    const { nodeId, offsetX, offsetY } = dragRef.current;
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, fx: x + offsetX, fy: y + offsetY } : n));
  };

  const handleMouseUp = () => {
    if (dragRef.current) {
      const id = dragRef.current.nodeId;
      setNodes(prev => prev.map(n => n.id === id ? { ...n, fx: null, fy: null } : n));
      dragRef.current = null;
    }
  };

  const getNodeRadius = (group: string) => {
    switch (group) {
      case 'article': return 18;
      case 'sector': return 12;
      case 'entity': return 10;
      case 'impact': return 8;
      default: return 10;
    }
  };

  const groupColors: Record<string, string> = {
    article: 'var(--accent)',
    ticker: 'hsl(190 70% 50%)',
    company: 'hsl(280 50% 55%)',
    sector: 'hsl(45 70% 50%)',
    person: 'hsl(330 60% 55%)',
    institution: 'hsl(150 50% 45%)',
    event: 'hsl(270 60% 55%)',
    impact: 'hsl(0 60% 50%)',
    related_article: 'hsl(210 40% 40%)',
  };

  return (
    <div 
      ref={containerRef}
      style={{ position: 'relative', width: '100%', minHeight: '500px', background: 'hsl(225 15% 4%)', borderRadius: 'var(--radius)' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg 
        ref={svgRef} 
        viewBox={`0 0 ${W} ${H}`} 
        style={{ width: '100%', height: '500px', cursor: dragRef.current ? 'grabbing' : 'default' }}
        role="img"
        aria-label="Grafo de entidades do artigo"
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const s = nodes.find(n => n.id === e.source);
          const t = nodes.find(n => n.id === e.target);
          if (!s || !t || s.x === undefined || t.x === undefined) return null;
          return (
            <line 
              key={i} 
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke="var(--border)" 
              strokeWidth={Math.max(e.weight * 2, 0.5)} 
              strokeOpacity={0.5}
              onMouseEnter={(evt) => e.label && setHoveredEdge({ label: e.label, x: evt.clientX, y: evt.clientY })}
              onMouseLeave={() => setHoveredEdge(null)}
              style={{ transition: 'stroke-opacity 0.2s' }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          if (n.x === undefined) return null;
          const r = getNodeRadius(n.group);
          const color = groupColors[n.group] || 'var(--text-muted)';
          return (
            <g 
              key={n.id} 
              onMouseDown={(e) => handleMouseDown(n.id, e)}
              style={{ cursor: 'grab' }}
            >
              <circle 
                cx={n.x} cy={n.y} r={r} 
                fill={color} fillOpacity={0.15} 
                stroke={color} strokeWidth={1.5} 
                filter="url(#glow)"
              />
              <text 
                x={n.x} y={n.y + r + 14} 
                textAnchor="middle" 
                fill="var(--text-tertiary)"
                fontSize={n.group === 'article' ? 10 : 9} 
                fontFamily="var(--font-mono)"
                pointerEvents="none"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                {(n.label || '').slice(0, 24)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip for edges */}
      {hoveredEdge && (
        <div style={{
          position: 'fixed',
          left: hoveredEdge.x + 10,
          top: hoveredEdge.y + 10,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.625rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
          pointerEvents: 'none',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}>
          {hoveredEdge.label}
        </div>
      )}
    </div>
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
                <h2 style={{ fontSize: '1.125rem', lineHeight: 1.35, marginBottom: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
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
                  borderRadius: 'var(--radius)', overflow: 'hidden',
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
