'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';

interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
  metadata?: any;
}

interface Link {
  source_id: string;
  target_id: string;
  type?: string;
  strength?: number;
}

interface Node extends Project {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

interface Edge {
  source: Node;
  target: Node;
  strength: number;
}

interface Props {
  projects: Project[];
  links: Link[];
}

export default function ProjectsClient({ projects, links }: Props) {
  const canvasRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [draggedNode, setDraggedNode] = useState<Node | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Initialize simulation data
  useEffect(() => {
    const width = window.innerWidth > 1400 ? 1400 : window.innerWidth;
    const height = Math.max(window.innerHeight - 300, 600);
    setDimensions({ width, height });

    const initialNodes: Node[] = projects.map((p, i) => ({
      ...p,
      x: width / 2 + (Math.random() - 0.5) * 400,
      y: height / 2 + (Math.random() - 0.5) * 400,
      vx: 0,
      vy: 0,
    }));

    const nodeMap = new Map(initialNodes.map(n => [n.id, n]));
    
    const initialEdges: Edge[] = links
      .filter(l => nodeMap.has(l.source_id) && nodeMap.has(l.target_id))
      .map(l => ({
        source: nodeMap.get(l.source_id)!,
        target: nodeMap.get(l.target_id)!,
        strength: l.strength || 0.5,
      }));

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [projects, links]);

  // Velocity-Verlet Physics Simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    let animationFrameId: number;
    const friction = 0.95;
    const repulsion = 1500;
    const springStrength = 0.05;
    const springLength = 150;
    const centerGravity = 0.01;

    const step = () => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map(n => ({ ...n }));
        const nodeMap = new Map(newNodes.map(n => [n.id, n]));

        // 1. Repulsion (Many-Body Force)
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const nodeA = newNodes[i];
            const nodeB = newNodes[j];
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distanceSq = dx * dx + dy * dy || 1;
            const distance = Math.sqrt(distanceSq);
            
            const force = repulsion / distanceSq;
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            nodeA.vx -= fx;
            nodeA.vy -= fy;
            nodeB.vx += fx;
            nodeB.vy += fy;
          }
        }

        // 2. Spring Force (Edges)
        edges.forEach(edge => {
          const source = nodeMap.get(edge.source.id)!;
          const target = nodeMap.get(edge.target.id)!;
          
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const force = (distance - springLength) * springStrength * edge.strength;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        });

        // 3. Center Gravity
        newNodes.forEach(node => {
          node.vx += (dimensions.width / 2 - node.x) * centerGravity;
          node.vy += (dimensions.height / 2 - node.y) * centerGravity;
        });

        // 4. Update Positions
        newNodes.forEach(node => {
          if (node.fx !== undefined && node.fx !== null && node.fy !== undefined && node.fy !== null) {
            node.x = node.fx;
            node.y = node.fy;
            node.vx = 0;
            node.vy = 0;
          } else {
            node.vx *= friction;
            node.vy *= friction;
            node.x += node.vx;
            node.y += node.vy;
          }

          // Bounds
          const padding = 20;
          if (node.x < padding) node.x = padding;
          if (node.x > dimensions.width - padding) node.x = dimensions.width - padding;
          if (node.y < padding) node.y = padding;
          if (node.y > dimensions.height - padding) node.y = dimensions.height - padding;
        });

        return newNodes;
      });

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [edges, dimensions]);

  const handleMouseDown = (e: React.MouseEvent, node: Node) => {
    setDraggedNode(node);
    node.fx = node.x;
    node.fy = node.y;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setNodes(prev => prev.map(n => n.id === draggedNode.id ? { ...n, fx: x, fy: y } : n));
  };

  const handleMouseUp = () => {
    if (draggedNode) {
      setNodes(prev => prev.map(n => n.id === draggedNode.id ? { ...n, fx: null, fy: null } : n));
      setDraggedNode(null);
    }
  };

  if (projects.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 0', color: 'var(--text-muted)' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', marginBottom: '16px', fontWeight: 400 }}>
          Projetos & Dependências
        </h1>
        <div style={{ fontSize: '1rem', opacity: 0.6, maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
          Nenhum projeto mapeado no grafo. <br/>Aguardando ingestão de dados da tabela <code style={{color:'var(--accent)'}}>cronos_projects</code>.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 400 }}>Projetos & Grafos</h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
          {projects.length} nós ativos · {links.length} conexões
        </span>
      </div>

      <div 
        className="surface-elevated"
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: `${dimensions.height}px`, 
          overflow: 'hidden',
          cursor: draggedNode ? 'grabbing' : 'default'
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg 
          ref={canvasRef}
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        >
          {/* Edges */}
          <g>
            {edges.map((edge, i) => {
              const source = nodes.find(n => n.id === edge.source.id);
              const target = nodes.find(n => n.id === edge.target.id);
              if (!source || !target) return null;
              
              const isRelated = hoveredNode && (hoveredNode.id === source.id || hoveredNode.id === target.id);

              return (
                <line
                  key={`${source.id}-${target.id}-${i}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isRelated ? 'var(--accent)' : 'var(--border)'}
                  strokeWidth={isRelated ? 2 : 1}
                  strokeOpacity={hoveredNode ? (isRelated ? 0.8 : 0.1) : 0.3}
                  transition="stroke 0.2s, stroke-width 0.2s, stroke-opacity 0.2s"
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {nodes.map(node => (
              <g 
                key={node.id}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onMouseDown={(e) => handleMouseDown(e, node)}
                style={{ cursor: 'grab' }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={hoveredNode?.id === node.id ? 8 : 5}
                  fill={hoveredNode?.id === node.id ? '#D4A017' : 'var(--bg-elevated)'}
                  stroke={hoveredNode?.id === node.id ? '#D4A017' : 'var(--accent)'}
                  strokeWidth={2}
                  style={{ transition: 'r 0.2s, fill 0.2s' }}
                />
                {(hoveredNode?.id === node.id || nodes.length < 15) && (
                  <text
                    x={node.x}
                    y={node.y - 15}
                    textAnchor="middle"
                    fill={hoveredNode?.id === node.id ? 'var(--text-primary)' : 'var(--text-secondary)'}
                    style={{ 
                      fontSize: '0.625rem', 
                      fontFamily: 'var(--font-mono)', 
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}
                  >
                    {node.name}
                  </text>
                )}
              </g>
            ))}
          </g>
        </svg>

        {/* Hover Info Panel */}
        {hoveredNode && (
          <div 
            style={{
              position: 'absolute',
              bottom: '24px',
              right: '24px',
              width: '280px',
              padding: '16px',
              background: 'rgba(6, 7, 10, 0.9)',
              border: '1px solid var(--accent)',
              borderRadius: '4px',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'none',
              zIndex: 10
            }}
            className="stagger"
          >
            <div style={{ color: '#D4A017', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '8px', fontWeight: 600 }}>
              {hoveredNode.name}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: '1.4' }}>
              {hoveredNode.description || 'Nenhuma descrição disponível para este nó.'}
            </div>
            {hoveredNode.status && (
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</span>
                <span style={{ fontSize: '0.625rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{hoveredNode.status}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '24px', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1px solid var(--accent)' }} />
          <span>Projeto / Agente</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '1px', background: 'var(--border)' }} />
          <span>Dependência</span>
        </div>
      </div>
    </div>
  );
}
