'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

import { Article, Entity, Impact } from '@/lib/types';

interface SearchResult {
  articles: Article[];
  entities: Entity[];
  impacts: Impact[];
}

interface Trending {
  id: string;
  value: string;
  type: string;
  mentions: number;
}

// --- Force-Directed Graph Component ---
function EntityGraph({ entities }: { entities: Entity[] }) {
  const canvasRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<(Entity & { x: number; y: number; vx: number; vy: number; radius: number })[]>([]);
  const [links, setLinks] = useState<{ source: number; target: number; strength: number }[]>([]);
  const [hoveredNode, setHoveredNode] = useState<(Entity & { x: number; y: number; vx: number; vy: number; radius: number }) | null>(null);
  const [dragging, setDragging] = useState<(Entity & { x: number; y: number; vx: number; vy: number; radius: number }) | null>(null);

  useEffect(() => {
    // Initialize nodes
    const initialNodes = entities.map((e, i) => ({
      ...e,
      x: Math.random() * 800,
      y: Math.random() * 500,
      vx: 0,
      vy: 0,
      radius: 6
    }));

    // Links based on shared sector
    const initialLinks: { source: number; target: number; strength: number }[] = [];
    for (let i = 0; i < initialNodes.length; i++) {
      for (let j = i + 1; j < initialNodes.length; j++) {
        const n1 = initialNodes[i];
        const n2 = initialNodes[j];
        const sharedSector = n1.sector && n1.sector === n2.sector;
        
        if (sharedSector) {
          initialLinks.push({ source: i, target: j, strength: 0.005 });
        }
      }
    }

    setNodes(initialNodes);
    setLinks(initialLinks);
  }, [entities]);

  useEffect(() => {
    if (nodes.length === 0) return;

    let frameId: number;
    const physics = () => {
      setNodes(prevNodes => {
        const nextNodes = prevNodes.map(n => ({ ...n }));
        const springK = 0.005;
        const repulsionK = 500;
        const damping = 0.95;

        for (let i = 0; i < nextNodes.length; i++) {
          const n1 = nextNodes[i];
          if (dragging && dragging.id === n1.id) continue;

          let fx = 0, fy = 0;

          // Repulsion
          for (let j = 0; j < nextNodes.length; j++) {
            if (i === j) continue;
            const n2 = nextNodes[j];
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            const distSq = dx * dx + dy * dy + 0.1;
            const dist = Math.sqrt(distSq);
            if (dist < 200) {
              const force = repulsionK / distSq;
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            }
          }

          // Centering force
          fx += (400 - n1.x) * 0.001;
          fy += (250 - n1.y) * 0.001;

          n1.vx = (n1.vx + fx) * damping;
          n1.vy = (n1.vy + fy) * damping;
        }

        // Springs
        links.forEach(link => {
          const n1 = nextNodes[link.source];
          const n2 = nextNodes[link.target];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const force = (dist - 100) * link.strength;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (!(dragging && dragging.id === n1.id)) { n1.vx += fx; n1.vy += fy; }
          if (!(dragging && dragging.id === n2.id)) { n2.vx -= fx; n2.vy -= fy; }
        });

        // Integrate
        nextNodes.forEach(n => {
          if (dragging && dragging.id === n.id) return;
          n.x += n.vx;
          n.y += n.vy;
          // Bounds
          n.x = Math.max(20, Math.min(780, n.x));
          n.y = Math.max(20, Math.min(480, n.y));
        });

        return nextNodes;
      });
      frameId = requestAnimationFrame(physics);
    };

    frameId = requestAnimationFrame(physics);
    return () => cancelAnimationFrame(frameId);
  }, [links, dragging]);

  const typeColors: Record<string, string> = {
    ticker: 'hsl(190 70% 50%)',
    company: 'hsl(280 50% 55%)',
    sector: 'hsl(45 70% 50%)',
    person: 'hsl(330 60% 55%)',
    institution: 'hsl(150 50% 45%)',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '500px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <svg
        ref={canvasRef}
        width="100%"
        height="100%"
        viewBox="0 0 800 500"
        onMouseMove={(e) => {
          if (dragging) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (800 / rect.width);
            const y = (e.clientY - rect.top) * (500 / rect.height);
            setNodes(prev => prev.map(n => n.id === dragging.id ? { ...n, x, y, vx: 0, vy: 0 } : n));
          }
        }}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
        role="img"
        aria-label="Grafo de entidades relacionadas"
      >
        {links.map((l, i) => (
          <line key={i} x1={nodes[l.source]?.x} y1={nodes[l.source]?.y} x2={nodes[l.target]?.x} y2={nodes[l.target]?.y} stroke="var(--border-subtle)" strokeWidth="1" />
        ))}
        {nodes.map(n => (
          <circle
            key={n.id}
            cx={n.x}
            cy={n.y}
            r={n.radius}
            fill={typeColors[n.type] || 'var(--text-muted)'}
            style={{ cursor: 'grab', filter: hoveredNode?.id === n.id ? 'brightness(1.5) drop-shadow(0 0 4px var(--accent))' : 'none' }}
            onMouseEnter={() => setHoveredNode(n)}
            onMouseLeave={() => setHoveredNode(null)}
            onMouseDown={(e) => { e.preventDefault(); setDragging(n); }}
          />
        ))}
      </svg>

      {hoveredNode && (
        <div style={{
          position: 'absolute', top: 12, left: 12, padding: '12px', background: 'var(--bg-elevated)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 10
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>{hoveredNode.value}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: typeColors[hoveredNode.type], textTransform: 'uppercase', marginTop: '2px' }}>{hoveredNode.type}</div>
          {hoveredNode.canonical_name && <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>{hoveredNode.canonical_name}</div>}
          {hoveredNode.sector && <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '2px' }}>{hoveredNode.sector}</div>}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ articles: [], entities: [], impacts: [] });
  const [trending, setTrending] = useState<Trending[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tab, setTab] = useState<'articles' | 'entities' | 'impacts'>('articles');
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  useEffect(() => {
    fetch('/api/cronos/search?type=trending').then(r => r.json()).then(setTrending).catch(() => {});
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      const [articlesRes, entitiesRes, impactsRes] = await Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(query)}&limit=30`).then(r => r.json()),
        fetch(`/api/cronos/search?type=entities&q=${encodeURIComponent(query)}`).then(r => r.json()).catch(() => []),
        fetch(`/api/cronos/search?type=impacts&q=${encodeURIComponent(query)}`).then(r => r.json()).catch(() => []),
      ]);
      setResults({
        articles: articlesRes.articles || [],
        entities: Array.isArray(entitiesRes) ? entitiesRes : entitiesRes.entities || [],
        impacts: Array.isArray(impactsRes) ? impactsRes : impactsRes.impacts || [],
      });
    } catch {
      setResults({ articles: [], entities: [], impacts: [] });
    } finally {
      setLoading(false);
    }
  }

  const S = {
    label: { fontFamily: 'var(--font-mono)', fontSize: '0.5625rem' as const, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
    mono: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' as const },
  };

  const totalResults = results.articles.length + results.entities.length + results.impacts.length;

  const tabs = [
    { key: 'articles' as const, label: 'Artigos', count: results.articles.length },
    { key: 'entities' as const, label: 'Entidades', count: results.entities.length },
    { key: 'impacts' as const, label: 'Impactos', count: results.impacts.length },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px' }}>Busca Profunda</h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
          Full-text search em todas as notícias, entidades e impactos financeiros
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por ticker, empresa, setor, tema..."
            style={{
              flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '12px 16px', color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px', background: loading ? 'var(--bg-elevated)' : 'var(--accent)',
              color: loading ? 'var(--text-muted)' : 'hsl(225 15% 4%)', border: 'none',
              borderRadius: 'var(--radius)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
              fontWeight: 600, cursor: loading ? 'wait' : 'pointer', textTransform: 'uppercase',
            }}
          >
            {loading ? '...' : 'Buscar'}
          </button>
        </form>

        {trending.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={S.label}>Trending:</span>
            {trending.slice(0, 5).map(t => (
              <button 
                key={t.id} 
                onClick={() => { setQuery(t.value); handleSearch({ preventDefault: () => {} } as unknown as React.FormEvent); }}
                style={{
                  padding: '2px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  borderRadius: '12px', color: 'var(--text-secondary)', ...S.mono, fontSize: '0.625rem', cursor: 'pointer'
                }}
              >
                {t.value} <span style={{ opacity: 0.5 }}>{t.mentions}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="pulse" style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '8px' }}>◈</div>
          <div style={{ fontSize: '0.8125rem' }}>Pesquisando...</div>
        </div>
      )}

      {!loading && searched && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', gap: '2px' }}>
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.6875rem',
                    color: tab === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    padding: '8px 16px', background: 'transparent', border: 'none',
                    borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                  <span style={{ ...S.mono, fontSize: '0.5625rem', color: 'var(--text-muted)', marginLeft: '6px' }}>{t.count}</span>
                </button>
              ))}
            </div>

            {tab === 'entities' && results.entities.length > 0 && (
              <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '4px' }}>
                <button 
                  onClick={() => setViewMode('list')}
                  style={{ padding: '4px 10px', ...S.mono, fontSize: '0.625rem', background: viewMode === 'list' ? 'var(--bg-elevated)' : 'transparent', border: 'none', color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  LISTA
                </button>
                <button 
                  onClick={() => setViewMode('graph')}
                  style={{ padding: '4px 10px', ...S.mono, fontSize: '0.625rem', background: viewMode === 'graph' ? 'var(--bg-elevated)' : 'transparent', border: 'none', color: viewMode === 'graph' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  GRAFO
                </button>
              </div>
            )}
          </div>

          {totalResults === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '0.8125rem' }}>Nenhum resultado para &quot;{query}&quot;</div>
            </div>
          )}

          {tab === 'articles' && results.articles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {results.articles.map((a) => {
                const sent = a.cronos_sentiment?.[0];
                const score = sent?.score ?? 0;
                const hue = score > 0.05 ? 155 : score < -0.05 ? 0 : 45;
                return (
                  <a key={a.id} href={a.url} target="_blank" rel="noopener" className="interactive stagger" style={{ display: 'grid', gridTemplateColumns: '8px 1fr auto', gap: '12px', alignItems: 'start', padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ paddingTop: '6px' }}>
                      <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: `hsl(${hue} ${Math.min(Math.abs(score) * 800, 80)}% 50%)` }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.45, marginBottom: '3px' }}>{a.title}</div>
                      {a.summary && <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.summary}</div>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, paddingTop: '2px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{a.source}</div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {tab === 'entities' && results.entities.length > 0 && (
            viewMode === 'list' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '4px' }}>
                {results.entities.map((e) => {
                  const colors: Record<string, string> = { ticker: 'hsl(190 70% 50%)', company: 'hsl(270 50% 55%)', sector: 'hsl(150 60% 45%)' };
                  return (
                    <a key={e.id} href={`/entity/${e.id}`} className="interactive stagger" style={{ padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderLeft: `2px solid ${colors[e.type] || 'var(--text-muted)'}`, borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>{e.value}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: colors[e.type] || 'var(--text-muted)', textTransform: 'uppercase' }}>{e.type}</span>
                      </div>
                      {e.canonical_name && <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{e.canonical_name}</div>}
                    </a>
                  );
                })}
              </div>
            ) : (
              <EntityGraph entities={results.entities} />
            )
          )}

          {tab === 'impacts' && results.impacts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {results.impacts.map((imp, i: number) => (
                <div key={i} className="interactive stagger" style={{ display: 'grid', gridTemplateColumns: '60px 1fr 70px 80px', gap: '14px', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500 }}>{imp.ticker}</span>
                  <div style={{ height: '3px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min((imp.impact_score || 0) * 100, 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: '2px' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: (imp.delta_1d || 0) > 0 ? 'var(--signal-up)' : (imp.delta_1d || 0) < 0 ? 'var(--signal-down)' : 'var(--text-tertiary)', textAlign: 'right' }}>
                    {imp.delta_1d != null ? `${imp.delta_1d > 0 ? '+' : ''}${imp.delta_1d.toFixed(2)}%` : '—'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', textAlign: 'right' }}>score {(imp.impact_score || 0).toFixed(3)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!searched && !loading && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', marginBottom: '12px', color: 'var(--text-tertiary)' }}>◈</div>
          <div style={{ fontSize: '0.8125rem', marginBottom: '4px' }}>Tickers · Empresas · Setores · Temas</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>Busca integrada em artigos, entidades e correlações de impacto</div>
        </div>
      )}
    </div>
  );
}
