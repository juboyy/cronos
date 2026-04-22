'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Correlation, Cluster, Briefing, GraphNode, GraphEdge, Impact, ArticleWithMeta } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

interface Props {
  correlations: Correlation[];
  clusters: Cluster[];
  briefings: Briefing[];
  searchResult?: {
    entities: any[];
    articles: any[];
    relationships: GraphEdge[];
    sentiments: any[];
    impacts: Impact[];
    meta: any;
  } | null;
  isSearching?: boolean;
}

// --- Utils ---
function parseJSON<T>(val: T | string): T {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (e) { return [] as any; }
  }
  return val as T;
}

// --- Components ---

const RelationshipGraph = ({ nodes: initialNodes, edges, width = 600, height = 400 }: { nodes: GraphNode[], edges: GraphEdge[], width?: number, height?: number }) => {
  const [nodes, setNodes] = useState<GraphNode[]>(initialNodes);
  const containerRef = useRef<SVGSVGElement>(null);
  const dragTarget = useRef<string | null>(null);

  useEffect(() => {
    let animationFrame: number;
    const physics = () => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map(n => ({ ...n, vx: (n.vx || 0) * 0.95, vy: (n.vy || 0) * 0.95 }));

        // Repulsion
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[i].x! - newNodes[j].x!;
            const dy = newNodes[i].y! - newNodes[j].y!;
            const distSq = dx * dx + dy * dy || 1;
            const force = 500 / distSq;
            const fx = (dx / Math.sqrt(distSq)) * force;
            const fy = (dy / Math.sqrt(distSq)) * force;
            if (newNodes[i].id !== dragTarget.current) { newNodes[i].vx! += fx; newNodes[i].vy! += fy; }
            if (newNodes[j].id !== dragTarget.current) { newNodes[j].vx! -= fx; newNodes[j].vy! -= fy; }
          }
        }

        // Springs
        edges.forEach(edge => {
          const s = newNodes.find(n => n.id === edge.source);
          const t = newNodes.find(n => n.id === edge.target);
          if (!s || !t) return;
          const dx = t.x! - s.x!;
          const dy = t.y! - s.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 100) * 0.005;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (s.id !== dragTarget.current) { s.vx! += fx; s.vy! += fy; }
          if (t.id !== dragTarget.current) { t.vx! -= fx; t.vy! -= fy; }
        });

        // Center gravity
        newNodes.forEach(n => {
          if (n.id === dragTarget.current) return;
          n.vx! += (width / 2 - n.x!) * 0.001;
          n.vy! += (height / 2 - n.y!) * 0.001;
          n.x! += n.vx!;
          n.y! += n.vy!;
        });

        return newNodes;
      });
      animationFrame = requestAnimationFrame(physics);
    };
    physics();
    return () => cancelAnimationFrame(animationFrame);
  }, [edges, width, height]);

  const getColor = (type: string) => {
    if (type === 'ticker') return 'hsl(190 70% 50%)';
    if (type === 'company') return 'hsl(280 50% 55%)';
    return 'hsl(45 70% 50%)';
  };

  return (
    <svg 
      ref={containerRef}
      width={width} height={height} 
      viewBox={`0 0 ${width} ${height}`}
      style={{ background: 'hsl(225 12% 4%)', borderRadius: '8px', cursor: 'grab' }}
      onMouseMove={(e) => {
        if (!dragTarget.current) return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setNodes(prev => prev.map(n => n.id === dragTarget.current ? { ...n, x, y, vx: 0, vy: 0 } : n));
      }}
      onMouseUp={() => { dragTarget.current = null; }}
      onMouseLeave={() => { dragTarget.current = null; }}
    >
      {edges.map((e, i) => {
        const s = nodes.find(n => n.id === e.source);
        const t = nodes.find(n => n.id === e.target);
        if (!s || !t) return null;
        return (
          <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} 
            stroke="white" strokeOpacity="0.1" strokeWidth={Math.log(e.weight + 1) + 1} />
        );
      })}
      {nodes.map(n => (
        <g key={n.id} transform={`translate(${n.x},${n.y})`} 
          onMouseDown={() => { dragTarget.current = n.id; }}
          style={{ cursor: 'pointer' }}>
          <circle r="6" fill={getColor(n.type)} stroke="white" strokeWidth="1" />
          <text dy="18" textAnchor="middle" fill="white" fontSize="10" fontFamily="var(--font-mono)" style={{ pointerEvents: 'none' }}>
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

const SentimentGauge = ({ value, size = 100 }: { value: number, size?: number }) => {
  const radius = size / 2 - 10;
  const normalized = (value + 1) / 2; // 0 to 1
  const angle = normalized * 180 - 180;
  return (
    <div style={{ position: 'relative', width: size, height: size / 2 + 10 }}>
      <svg width={size} height={size / 2 + 10}>
        <path d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`} 
          fill="none" stroke="hsl(225 10% 20%)" strokeWidth="8" strokeLinecap="round" />
        <path d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`} 
          fill="none" stroke="url(#sentimentGradient)" strokeWidth="8" strokeLinecap="round" 
          strokeDasharray={`${normalized * Math.PI * radius} 1000`} />
        <defs>
          <linearGradient id="sentimentGradient">
            <stop offset="0%" stopColor="var(--signal-down)" />
            <stop offset="50%" stopColor="var(--signal-neutral)" />
            <stop offset="100%" stopColor="var(--signal-up)" />
          </linearGradient>
        </defs>
        <line x1={size / 2} y1={size / 2} x2={size / 2 + Math.cos((angle * Math.PI) / 180) * (radius - 5)} 
          y2={size / 2 + Math.sin((angle * Math.PI) / 180) * (radius - 5)} 
          stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div style={{ 
        position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', 
        fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600 
      }}>
        {value.toFixed(2)}
      </div>
    </div>
  );
};

const Sparkline = ({ data, width = 100, height = 30 }: { data: number[], width?: number, height?: number }) => {
  if (data.length < 2) return null;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v + 1) / 2) * height}`).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" points={points} />
    </svg>
  );
};

export function IntelligenceDashboard({ correlations, clusters, briefings, searchResult, isSearching }: Props) {
  const [tab, setTab] = useState<'correlations' | 'clusters' | 'briefings'>('correlations');

  const searchData = useMemo(() => {
    if (!searchResult) return null;
    const nodes: GraphNode[] = searchResult.entities.map((e, i) => ({
      id: e.id,
      type: e.type,
      label: e.value,
      group: e.type,
      x: 300 + Math.random() * 10,
      y: 200 + Math.random() * 10,
    }));
    return { nodes, edges: searchResult.relationships };
  }, [searchResult]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Search Results Panel */}
      {searchResult && (
        <div style={{ 
          background: 'hsl(225 12% 6%)', border: '1px solid hsl(225 10% 15%)', 
          borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', margin: 0 }}>Search Results</h2>
            <button onClick={() => {}} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem' }}>Clear</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Entity Card */}
            <div style={{ background: 'hsl(225 15% 3.5%)', padding: '16px', borderRadius: '12px', border: '1px solid hsl(225 10% 10%)' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '48px', height: '48px', background: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🏢</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{searchResult.entities[0]?.value || 'Entity'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {searchResult.entities[0]?.type.toUpperCase()} • {searchResult.entities[0]?.sector || 'General'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {searchResult.impacts[0] && (
                  <>
                    <div style={{ background: 'hsl(225 10% 8%)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>1D DELTA</div>
                      <div style={{ color: searchResult.impacts[0].delta_1d! > 0 ? 'var(--signal-up)' : 'var(--signal-down)', fontWeight: 600 }}>
                        {searchResult.impacts[0].delta_1d! > 0 ? '+' : ''}{(searchResult.impacts[0].delta_1d! * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div style={{ background: 'hsl(225 10% 8%)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>VOL RATIO</div>
                      <div style={{ fontWeight: 600 }}>{searchResult.impacts[0].volume_ratio.toFixed(2)}x</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Graph Card */}
            <div style={{ minHeight: '300px', gridRow: 'span 2' }}>
              <div style={{ marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>RELATIONSHIP GRAPH</div>
              {searchData && <RelationshipGraph nodes={searchData.nodes} edges={searchData.edges} width={400} height={350} />}
            </div>

            {/* Articles List */}
            <div style={{ background: 'hsl(225 15% 3.5%)', padding: '16px', borderRadius: '12px', border: '1px solid hsl(225 10% 10%)' }}>
               <div style={{ marginBottom: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>RELATED ARTICLES</div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                 {searchResult.articles.map((a, i) => (
                   <div key={i} style={{ fontSize: '0.8rem', paddingBottom: '8px', borderBottom: '1px solid hsl(225 10% 10%)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                       <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--signal-up)' }} />
                       <span style={{ fontWeight: 500 }}>{a.title}</span>
                     </div>
                     <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.source} • {timeAgo(a.published_at)}</div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid hsl(225 10% 15%)' }}>
        {['correlations', 'clusters', 'briefings'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            style={{
              padding: '12px 24px', background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t ? 'white' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              fontFamily: 'var(--font-mono)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {tab === 'correlations' && correlations.map(c => {
          const rawSources = parseJSON(c.sources);
          // Normalize sources: could be Record<string, number> OR array of {source, count} objects
          const sources: Record<string, number> = Array.isArray(rawSources)
            ? rawSources.reduce((acc: Record<string, number>, item: any) => {
                if (item && typeof item === 'object' && 'source' in item) {
                  acc[item.source] = item.count ?? 1;
                }
                return acc;
              }, {})
            : (rawSources && typeof rawSources === 'object' ? rawSources as Record<string, number> : {});
          const consensusColor = `hsl(${c.sentiment_consensus * 120} 70% 45%)`;
          return (
            <div key={c.id} style={{ 
              background: 'hsl(225 12% 6%)', border: '1px solid hsl(225 10% 10%)', borderRadius: '12px', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{c.entity_value}</div>
                  <div style={{ background: 'hsl(225 10% 15%)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', alignSelf: 'center', fontFamily: 'var(--font-mono)' }}>{c.entity_type}</div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{timeAgo(c.created_at)}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TRANSMISSION CHAIN</div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--accent)' }}>{c.entity_value}</span>
                      <span style={{ opacity: 0.3 }}>→</span>
                      <span style={{ background: 'hsl(225 10% 15%)', padding: '2px 6px', borderRadius: '4px' }}>{c.source_count} Sources</span>
                      <span style={{ opacity: 0.3 }}>→</span>
                      <span style={{ color: c.avg_sentiment > 0 ? 'var(--signal-up)' : 'var(--signal-down)' }}>{c.avg_sentiment > 0 ? 'Bullish' : 'Bearish'}</span>
                   </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CONSENSUS METER</div>
                   <div style={{ height: '8px', width: '100%', background: 'hsl(225 10% 15%)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${c.sentiment_consensus * 100}%`, background: consensusColor, transition: 'width 0.5s' }} />
                   </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SOURCE DISTRIBUTION</div>
                   <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      {Object.entries(sources).map(([src, count], i) => (
                        <div key={i} style={{ width: `${(count / c.source_count) * 100}%`, background: `hsl(${i * 40} 50% 50%)` }} title={src} />
                      ))}
                   </div>
                </div>
              </div>
            </div>
          );
        })}

        {tab === 'clusters' && clusters.map(c => {
          const typeColors: any = { burst: 'var(--signal-down)', emerging: 'var(--signal-up)', sustained: 'var(--accent)' };
          const keywords: string[] = (() => {
            const k = parseJSON(c.keywords);
            return Array.isArray(k) ? k : [];
          })();
          const clusterSources: string[] = (() => {
            const s = parseJSON(c.sources);
            if (Array.isArray(s)) return s.map((item: any) => typeof item === 'string' ? item : (item?.source || String(item)));
            return [];
          })();
          return (
            <div key={c.id} style={{ 
              background: 'hsl(225 12% 6%)', border: '1px solid hsl(225 10% 10%)', borderRadius: '12px', padding: '16px',
              borderLeft: `4px solid ${typeColors[c.cluster_type] || 'gray'}`,
              animation: c.cluster_type === 'burst' ? 'pulseRed 2s infinite' : c.cluster_type === 'emerging' ? 'growGreen 2s infinite' : 'steadyBlue 4s infinite'
            }}>
              <style>{`
                @keyframes pulseRed { 0% { border-left-color: var(--signal-down); } 50% { border-left-color: transparent; } 100% { border-left-color: var(--signal-down); } }
                @keyframes growGreen { 0% { border-left-width: 4px; } 50% { border-left-width: 8px; } 100% { border-left-width: 4px; } }
                @keyframes steadyBlue { 0% { box-shadow: 0 0 0px var(--accent); } 50% { box-shadow: 0 0 10px var(--accent); } 100% { box-shadow: 0 0 0px var(--accent); } }
              `}</style>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{c.title}</div>
                <div style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: typeColors[c.cluster_type], color: 'white', fontWeight: 600 }}>{c.cluster_type.toUpperCase()}</div>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '16px' }}>
                "{c.article_count} artigos sobre {c.title} de {clusterSources.slice(0,2).join(', ')}... em {Math.round(c.window_minutes/60)}h — sentimento {c.dominant_sentiment}"
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {keywords.map((k: any, i: number) => (
                  <span key={i} style={{ 
                    fontSize: `${0.6 + (Math.random() * 0.4)}rem`, 
                    padding: '2px 8px', background: 'hsl(225 10% 15%)', borderRadius: '4px', color: 'white' 
                  }}>{k}</span>
                ))}
              </div>

              <div style={{ borderTop: '1px solid hsl(225 10% 10%)', paddingTop: '12px' }}>
                 <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px' }}>ARTICLE TIMELINE</div>
                 <div style={{ display: 'flex', gap: '4px' }}>
                    {Array.from({ length: c.article_count }).map((_, i) => (
                      <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', opacity: 0.3 + (i / c.article_count) * 0.7 }} />
                    ))}
                 </div>
              </div>
            </div>
          );
        })}

        {tab === 'briefings' && briefings.map(b => {
          const topEnts: any[] = (() => { const v = parseJSON(b.top_entities); return Array.isArray(v) ? v : []; })();
          const breakdown: Record<string, any> = (() => {
            const v = parseJSON(b.source_breakdown);
            if (Array.isArray(v)) {
              return v.reduce((acc: Record<string, any>, item: any) => {
                if (item && typeof item === 'object' && 'source' in item) acc[item.source] = item.count ?? 1;
                return acc;
              }, {});
            }
            return v && typeof v === 'object' ? v : {};
          })();
          return (
            <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Executive Summary Card */}
              <div style={{ background: 'hsl(225 12% 6%)', border: '1px solid hsl(225 10% 10%)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                   <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>Briefing: {b.date}</h3>
                   <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--signal-up)' }}>
                        <span style={{ fontSize: '0.8rem' }}>↑</span> <span style={{ fontSize: '0.7rem' }}>12% Articles</span>
                      </div>
                   </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>🎯 KEY TAKEAWAY</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{b.summary.split('.')[0]}.</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>📊 MARKET PULSE</div>
                    <SentimentGauge value={b.market_mood} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>🔥 HOT TOPICS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {topEnts.slice(0,3).map((e: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span>{e.entity}</span>
                          <span style={{ color: 'var(--accent)' }}>×{e.mentions} ↑</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Source Matrix */}
              <div style={{ background: 'hsl(225 12% 6%)', border: '1px solid hsl(225 10% 10%)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>SOURCE × SENTIMENT MATRIX</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                   {Object.entries(breakdown).map(([src, count]: [string, any], i) => (
                     <div key={i} style={{ padding: '12px', background: 'hsl(225 10% 8%)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>{src}</div>
                        <div style={{ height: '4px', background: 'hsl(225 10% 20%)', borderRadius: '2px', overflow: 'hidden' }}>
                           <div style={{ height: '100%', width: `${Math.random() * 100}%`, background: 'var(--accent)' }} />
                        </div>
                        <div style={{ fontSize: '0.6rem', marginTop: '4px', color: 'var(--text-muted)' }}>{count} Articles</div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
