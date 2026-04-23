'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';

interface Node {
  id: string;
  label: string;
  name: string;
  type: 'company' | 'macro';
  sector?: string;
  ticker?: string;
  companyName?: string;
  impactCount: number;
  avgSentiment: number;
  avgImpact: number;
  avgDelta: number;
  volAnomalies: number;
  patterns: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

interface Edge {
  source: string;
  target: string;
  weight: number;
  sourceNode?: Node;
  targetNode?: Node;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
  sectors: string[];
}

export default function AnalysisPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  
  const stateRef = useRef({
    nodes: [] as Node[],
    edges: [] as Edge[],
    width: 0,
    height: 0,
    draggingNode: null as Node | null,
    transform: { x: 0, y: 0, k: 1 }
  });

  useEffect(() => {
    fetch('/api/cronos/graph')
      .then(res => res.json())
      .then((resData: GraphData) => {
        const nodes = resData.nodes.map(n => ({
          ...n,
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: 0,
          vy: 0
        }));
        
        const edges = resData.edges.map(e => ({
          ...e,
          sourceNode: nodes.find(n => n.id === e.source),
          targetNode: nodes.find(n => n.id === e.target)
        })).filter(e => e.sourceNode && e.targetNode);

        setData({ ...resData, nodes, edges });
        stateRef.current.nodes = nodes;
        stateRef.current.edges = edges;
      });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const update = () => {
      const { nodes, edges, width, height } = stateRef.current;
      
      // Physics Constants
      const k = 0.1; // Spring constant
      const repulse = 1500; // Coulomb constant
      const gravity = 0.05; // Center gravity
      const damping = 0.92;

      // Coulomb Force (Repulsion)
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);
          const force = repulse / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      }

      // Hooke's Law (Attraction)
      for (const edge of edges) {
        const n1 = edge.sourceNode!;
        const n2 = edge.targetNode!;
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const force = (dist - 100) * k * (edge.weight || 1);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        n1.vx += fx;
        n1.vy += fy;
        n2.vx -= fx;
        n2.vy -= fy;
      }

      // Gravity & Update Positions
      const centerX = width / 2;
      const centerY = height / 2;
      for (const n of nodes) {
        if (n === stateRef.current.draggingNode) continue;
        
        n.vx += (centerX - n.x) * gravity;
        n.vy += (centerY - n.y) * gravity;
        
        n.vx *= damping;
        n.vy *= damping;
        
        n.x += n.vx;
        n.y += n.vy;
      }

      // Draw
      ctx.clearRect(0, 0, width, height);
      
      // Draw Edges
      const maxWeight = Math.max(...edges.map(e => e.weight), 1);
      ctx.strokeStyle = 'white';
      for (const edge of edges) {
        ctx.globalAlpha = (edge.weight / maxWeight) * 0.4;
        ctx.beginPath();
        ctx.moveTo(edge.sourceNode!.x, edge.sourceNode!.y);
        ctx.lineTo(edge.targetNode!.x, edge.targetNode!.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Sector Centroids
      const sectorGroups: Record<string, {x: number, y: number, count: number}> = {};
      nodes.forEach(n => {
        if (n.sector) {
          if (!sectorGroups[n.sector]) sectorGroups[n.sector] = {x: 0, y: 0, count: 0};
          sectorGroups[n.sector].x += n.x;
          sectorGroups[n.sector].y += n.y;
          sectorGroups[n.sector].count++;
        }
      });

      ctx.font = '9px IBM Plex Mono';
      ctx.textAlign = 'center';
      
      Object.entries(sectorGroups).forEach(([name, group]) => {
        ctx.fillStyle = 'rgba(221, 219, 216, 0.15)';
        ctx.fillText(name, group.x / group.count, group.y / group.count);
      });

      // Draw Nodes
      for (const n of nodes) {
        const radius = n.type === 'macro' ? 14 : Math.max(8, Math.sqrt(n.impactCount) * 3 + 4);
        
        ctx.fillStyle = n.type === 'macro' ? '#14b8a6' : 
                        n.avgSentiment > 0.15 ? '#10b981' : 
                        n.avgSentiment < -0.15 ? '#ef4444' : '#6366f1';
        
        if (hoveredNode?.id === n.id || selectedNode?.id === n.id) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = ctx.fillStyle;
        } else {
            ctx.shadowBlur = 0;
        }

        if (n.type === 'macro') {
          ctx.save();
          ctx.translate(n.x, n.y);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-radius/2, -radius/2, radius, radius);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#dddbd8';
        ctx.fillText(n.label, n.x, n.y + radius + 12);
      }

      animationFrameId = requestAnimationFrame(update);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 140;
      stateRef.current.width = canvas.width;
      stateRef.current.height = canvas.height;
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    update();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [data, hoveredNode, selectedNode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = stateRef.current.nodes.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });

    if (hit) {
      stateRef.current.draggingNode = hit;
      setSelectedNode(hit);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (stateRef.current.draggingNode) {
      stateRef.current.draggingNode.x = x;
      stateRef.current.draggingNode.y = y;
      return;
    }

    const hit = stateRef.current.nodes.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });

    setHoveredNode(hit || null);
    if (hit) {
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        content: (
          <div className="p-2 text-xs">
            <div className="font-bold">{hit.label}</div>
            <div>Sentimento: {(hit.avgSentiment * 100).toFixed(1)}%</div>
            <div>Impactos: {hit.impactCount}</div>
          </div>
        )
      });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseUp = () => {
    stateRef.current.draggingNode = null;
  };

  return (
    <div className="flex flex-col h-screen bg-[#050709] text-[#dddbd8] font-sans overflow-hidden">
      <header className="p-6 border-b border-[#1a1c1e]">
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">Análise</h1>
        <p className="text-sm text-[#888] font-mono">Cronos X — Mapa de inteligência do mercado brasileiro</p>
      </header>

      <div className="px-6 py-2 bg-[#0a0c0e] border-b border-[#1a1c1e] text-[10px] font-mono flex gap-4 text-[#666]">
        <span>{data?.nodes.length || 0} nós</span>
        <span>·</span>
        <span>{data?.edges.length || 0} conexões</span>
        <span>·</span>
        <span>{data?.sectors.length || 0} setores</span>
      </div>

      <main className="flex flex-1 relative">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="cursor-crosshair"
        />

        {tooltip && (
          <div 
            className="fixed pointer-events-none bg-[#1a1c1e] border border-[#333] rounded shadow-xl z-50 font-mono"
            style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}
          >
            {tooltip.content}
          </div>
        )}

        {selectedNode && (
          <div className="absolute right-0 top-0 bottom-0 w-[380px] bg-[#0a0c0e]/95 backdrop-blur-md border-l border-[#1a1c1e] p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <button 
              onClick={() => setSelectedNode(null)}
              className="absolute top-4 right-4 text-[#666] hover:text-white"
            >
              ✕
            </button>
            
            <div className="mb-8">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#666] mb-1">Entidade</div>
              <h2 className="text-4xl font-display font-bold text-white">{selectedNode.label}</h2>
              <div className="text-sm text-[#888] mt-1">{selectedNode.name}</div>
            </div>

            <div className="flex gap-2 mb-8">
              {selectedNode.sector && (
                <span className="px-2 py-1 bg-[#1a1c1e] border border-[#333] rounded-sm text-[10px] font-mono">
                  {selectedNode.sector}
                </span>
              )}
              <span className="px-2 py-1 bg-[#14b8a6]/20 border border-[#14b8a6]/30 text-[#14b8a6] rounded-sm text-[10px] font-mono uppercase">
                {selectedNode.type}
              </span>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[10px] font-mono mb-2">
                  <span>SENTIMENTO MÉDIO</span>
                  <span style={{ color: selectedNode.avgSentiment > 0 ? '#10b981' : '#ef4444' }}>
                    {(selectedNode.avgSentiment * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#1a1c1e] rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500"
                    style={{ 
                      width: `${Math.abs(selectedNode.avgSentiment) * 100}%`,
                      marginLeft: selectedNode.avgSentiment > 0 ? '50%' : `${50 - Math.abs(selectedNode.avgSentiment) * 50}%`,
                      backgroundColor: selectedNode.avgSentiment > 0 ? '#10b981' : '#ef4444'
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#0d0f11] border border-[#1a1c1e] rounded">
                  <div className="text-[9px] font-mono text-[#666] mb-1 uppercase">Avg Impact</div>
                  <div className="text-xl font-display font-bold">{selectedNode.avgImpact.toFixed(2)}</div>
                </div>
                <div className="p-4 bg-[#0d0f11] border border-[#1a1c1e] rounded">
                  <div className="text-[9px] font-mono text-[#666] mb-1 uppercase">Avg Delta</div>
                  <div className={`text-xl font-display font-bold ${selectedNode.avgDelta >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {selectedNode.avgDelta >= 0 ? '+' : ''}{selectedNode.avgDelta.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono text-[#666] mb-3 uppercase">Anomalias de Volume</div>
                <div className="text-2xl font-bold">{selectedNode.volAnomalies}</div>
              </div>

              <div>
                <div className="text-[10px] font-mono text-[#666] mb-3 uppercase">Padrões Identificados</div>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.patterns.map((p, i) => (
                    <span key={i} className="px-2 py-1 bg-[#1a1c1e] text-[10px] font-mono rounded text-[#aaa]">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Serif&family=Space+Grotesk:wght@500;700&display=swap');
        
        :root {
          --font-mono: 'IBM Plex Mono', monospace;
          --font-display: 'Space Grotesk', sans-serif;
          --font-serif: 'Instrument Serif', serif;
        }
      `}</style>
    </div>
  );
}
