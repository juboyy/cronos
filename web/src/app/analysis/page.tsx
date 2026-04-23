'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';

interface Pattern {
  pattern_type: string;
  description: string;
  avg_impact: number;
  occurrences: number;
}

interface Node {
  id: string;
  label: string;
  name: string;
  type: string;
  sector: string;
  sourceCount: number;
  signalStrength: number;
  impactCount: number;
  avgSentiment: number;
  avgImpact: number;
  avgDelta: number;
  volAnomalies: number;
  patterns: Pattern[];
  // Physics properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

interface Edge {
  source: string;
  target: string;
  weight: number;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export default function AnalysisPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false, draggedNode: null as Node | null });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/cronos/graph');
        if (!res.ok) throw new Error('Failed to fetch graph data');
        const json = await res.json();
        
        // Initialize physics positions
        const nodes = json.nodes.map((n: Node) => ({
          ...n,
          x: Math.random() * 800,
          y: Math.random() * 600,
          vx: 0,
          vy: 0
        }));
        
        setData({ nodes, edges: json.edges });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const maxWeight = useMemo(() => {
    if (!data?.edges.length) return 1;
    return Math.max(...data.edges.map(e => e.weight));
  }, [data]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const nodes = data.nodes;
    const edges = data.edges;

    const animate = () => {
      // 1. Physics Simulation
      const width = canvas.width;
      const height = canvas.height;

      // Reset forces
      nodes.forEach(n => {
        n.fx = 0;
        n.fy = 0;
      });

      // Coulomb Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n1.x! - n2.x!;
          const dy = n1.y! - n2.y!;
          const distSq = dx * dx + dy * dy + 0.01;
          const force = 800 / distSq;
          const fx = (dx / Math.sqrt(distSq)) * force;
          const fy = (dy / Math.sqrt(distSq)) * force;
          n1.fx! += fx;
          n1.fy! += fy;
          n2.fx! -= fx;
          n2.fy! -= fy;
        }
      }

      // Hooke Attraction (Edges)
      edges.forEach(e => {
        const source = nodes.find(n => n.id === e.source);
        const target = nodes.find(n => n.id === e.target);
        if (source && target) {
          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
          const force = 0.005 * (dist - 100);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          source.fx! += fx;
          source.fy! += fy;
          target.fx! -= fx;
          target.fy! -= fy;
        }
      });

      // Gravity and Center Force
      nodes.forEach(n => {
        const dx = width / 2 - n.x!;
        const dy = height / 2 - n.y!;
        n.fx! += dx * 0.01;
        n.fy! += dy * 0.01;
      });

      // Update positions
      nodes.forEach(n => {
        if (n === mouseRef.current.draggedNode) {
          n.x = mouseRef.current.x;
          n.y = mouseRef.current.y;
          n.vx = 0;
          n.vy = 0;
        } else {
          n.vx = (n.vx! + n.fx!) * 0.92;
          n.vy = (n.vy! + n.fy!) * 0.92;
          n.x! += n.vx;
          n.y! += n.vy;
        }

        // Boundary constraints
        n.x = Math.max(20, Math.min(width - 20, n.x!));
        n.y = Math.max(20, Math.min(height - 20, n.y!));
      });

      // 2. Rendering
      ctx.clearRect(0, 0, width, height);

      // Draw edges
      edges.forEach(e => {
        const source = nodes.find(n => n.id === e.source);
        const target = nodes.find(n => n.id === e.target);
        if (source && target) {
          const opacity = (e.weight / maxWeight) * 0.6 + 0.1;
          ctx.beginPath();
          ctx.moveTo(source.x!, source.y!);
          ctx.lineTo(target.x!, target.y!);
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Draw nodes
      nodes.forEach(n => {
        const radius = Math.max(6, Math.sqrt(n.impactCount) * 3 + 4);
        let color = '#555';
        if (n.avgSentiment < -0.2) color = '#e04848';
        else if (n.avgSentiment > 0.2) color = '#4dcc7a';

        ctx.beginPath();
        ctx.arc(n.x!, n.y!, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (n === hoveredNode || n === selectedNode) {
          ctx.strokeStyle = 'var(--accent)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Label (optional, only for larger nodes or hovered)
        if (radius > 15 || n === hoveredNode) {
          ctx.font = '10px var(--font-mono)';
          ctx.fillStyle = 'var(--text-primary)';
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x!, n.y! + radius + 12);
        }
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [data, hoveredNode, selectedNode, maxWeight]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current || !data) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseRef.current.x = x;
    mouseRef.current.y = y;

    if (mouseRef.current.isDown && mouseRef.current.draggedNode) {
      return;
    }

    let found: Node | null = null;
    for (const n of data.nodes) {
      const dx = n.x! - x;
      const dy = n.y! - y;
      const radius = Math.max(6, Math.sqrt(n.impactCount) * 3 + 4);
      if (dx * dx + dy * dy < radius * radius) {
        found = n;
        break;
      }
    }
    setHoveredNode(found);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseRef.current.isDown = true;
    if (hoveredNode) {
      mouseRef.current.draggedNode = hoveredNode;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseRef.current.isDown && !mouseRef.current.draggedNode && !hoveredNode) {
      setSelectedNode(null);
    } else if (hoveredNode && !mouseRef.current.draggedNode) {
       // Just a click, not a drag that started elsewhere
       setSelectedNode(hoveredNode);
    } else if (mouseRef.current.draggedNode) {
       setSelectedNode(mouseRef.current.draggedNode);
    }
    
    mouseRef.current.isDown = false;
    mouseRef.current.draggedNode = null;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
        Carregando grafo...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: '#e04848', fontFamily: 'var(--font-mono)' }}>
        Erro: {error}
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '20px 30px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', margin: 0, color: 'var(--accent)' }}>Análise</h1>
        <p style={{ fontFamily: 'var(--font-display)', margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>
          Mapa de conexões entre ativos e eventos detectados pelo Cronos.
        </p>
      </header>

      {/* Stats Bar */}
      <div style={{ padding: '10px 30px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '30px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
        <div>NODES: <span style={{ color: 'var(--accent)' }}>{data?.nodes.length || 0}</span></div>
        <div>EDGES: <span style={{ color: 'var(--accent)' }}>{data?.edges.length || 0}</span></div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '15px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4dcc7a' }} /> Positivo</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e04848' }} /> Negativo</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#555' }} /> Neutro</span>
        </div>
      </div>

      {/* Main Content */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', height: 'calc(100vh - 120px)' }}>
        {data?.nodes.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Nenhum dado disponível para visualização.
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            style={{ display: 'block', cursor: hoveredNode ? 'pointer' : 'default' }}
          />
        )}

        {/* Tooltip */}
        {hoveredNode && !selectedNode && (
          <div style={{
            position: 'absolute',
            left: mouseRef.current.x + 15,
            top: mouseRef.current.y + 15,
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            pointerEvents: 'none',
            zIndex: 10,
            fontFamily: 'var(--font-mono)',
            fontSize: '11px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{hoveredNode.label}</div>
            <div>Sentimento: <span style={{ color: hoveredNode.avgSentiment > 0.2 ? '#4dcc7a' : hoveredNode.avgSentiment < -0.2 ? '#e04848' : '#aaa' }}>{(hoveredNode.avgSentiment * 100).toFixed(1)}%</span></div>
            <div>Impacto: {hoveredNode.impactCount} ocorrências</div>
          </div>
        )}

        {/* Detail Panel */}
        {selectedNode && (
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '360px',
            height: '100%',
            background: 'var(--bg-elevated)',
            borderLeft: '1px solid var(--border)',
            boxShadow: '-5px 0 15px rgba(0,0,0,0.3)',
            zIndex: 20,
            overflowY: 'auto',
            padding: '25px',
            fontFamily: 'var(--font-mono)'
          }}>
            <button
              onClick={() => setSelectedNode(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '4px' }}>{selectedNode.type}</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', margin: 0, color: 'var(--text-primary)' }}>{selectedNode.label}</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedNode.name}</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <span style={{ padding: '2px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}>{selectedNode.sector}</span>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                <span>Sentimento Médio</span>
                <span style={{ color: selectedNode.avgSentiment > 0.2 ? '#4dcc7a' : selectedNode.avgSentiment < -0.2 ? '#e04848' : 'var(--text-muted)' }}>
                  {(selectedNode.avgSentiment * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.abs(selectedNode.avgSentiment) * 100}%`,
                  marginLeft: selectedNode.avgSentiment > 0 ? '50%' : `${50 - Math.abs(selectedNode.avgSentiment) * 50}%`,
                  background: selectedNode.avgSentiment > 0.2 ? '#4dcc7a' : selectedNode.avgSentiment < -0.2 ? '#e04848' : '#555',
                  borderRadius: '3px'
                }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>AVG IMPACT</div>
                <div style={{ fontSize: '18px' }}>{selectedNode.avgImpact.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>AVG DELTA</div>
                <div style={{ fontSize: '18px', color: selectedNode.avgDelta >= 0 ? '#4dcc7a' : '#e04848' }}>
                  {selectedNode.avgDelta >= 0 ? '+' : ''}{selectedNode.avgDelta.toFixed(2)}%
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>VOL ANOMALIES</div>
                <div style={{ fontSize: '18px' }}>{selectedNode.volAnomalies}</div>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>SIGNALS</div>
                <div style={{ fontSize: '18px' }}>{selectedNode.sourceCount}</div>
              </div>
            </div>

            {selectedNode.patterns.length > 0 && (
              <div>
                <h3 style={{ fontSize: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '12px', textTransform: 'uppercase' }}>Padrões Detectados</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedNode.patterns.map((p, i) => (
                    <div key={i} style={{ padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{p.pattern_type}</span>
                        <span style={{ fontSize: '10px', color: 'var(--accent)' }}>x{p.occurrences}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
