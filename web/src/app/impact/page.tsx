'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Impact, Price, Sentiment, Entity } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

// --- Components ---

const Delta = ({ value }: { value: number | null }) => {
  if (value === null || value === undefined) return <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>—</span>;
  const color = value > 0 ? 'var(--signal-up)' : value < 0 ? 'var(--signal-down)' : 'var(--text-tertiary)';
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color, fontVariantNumeric: 'tabular-nums' }}>
      {value > 0 ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
};

const ConfidenceGauge = ({ value }: { value: number }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value * circumference) / 2; // Semi-circle
  
  return (
    <div style={{ position: 'relative', width: '40px', height: '25px', display: 'flex', justifyContent: 'center' }}>
      <svg width="40" height="25" viewBox="0 0 40 25">
        <path
          d="M 4 20 A 16 16 0 0 1 36 20"
          fill="none"
          stroke="var(--bg-surface)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 4 20 A 16 16 0 0 1 36 20"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${circumference / 2} ${circumference / 2}`}
          strokeDashoffset={circumference / 2 - (value * circumference / 2)}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div style={{ 
        position: 'absolute', bottom: 0, width: '100%', textAlign: 'center',
        fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-secondary)'
      }}>
        {(value * 100).toFixed(0)}%
      </div>
    </div>
  );
};

const Sparkline = ({ data, color = 'var(--accent)', width = 120, height = 30 }: { data: number[], color?: string, width?: number, height?: number }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// --- Main Page ---

export default function ImpactPage() {
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [selectedImpact, setSelectedImpact] = useState<Impact | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/cronos/impact').then(r => r.json()),
      fetch('/api/cronos/prices').then(r => r.json()),
      fetch('/api/cronos/entities').then(r => r.json()),
    ]).then(([imp, pr, ent]) => {
      setImpacts(imp);
      setPrices(pr);
      setEntities(ent);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    if (!impacts.length) return { total: 0, avgConf: 0, anomalies: 0 };
    return {
      total: impacts.length,
      avgConf: impacts.reduce((acc, i) => acc + (i.confidence || 0), 0) / impacts.length,
      anomalies: impacts.filter(i => i.volume_anomaly).length
    };
  }, [impacts]);

  const ranked = useMemo(() => {
    const tickerAgg: Record<string, { count: number; totalScore: number; volAnomalies: number }> = {};
    impacts.forEach(imp => {
      if (!tickerAgg[imp.ticker]) tickerAgg[imp.ticker] = { count: 0, totalScore: 0, volAnomalies: 0 };
      tickerAgg[imp.ticker].count++;
      tickerAgg[imp.ticker].totalScore += imp.impact_score || 0;
      if (imp.volume_anomaly) tickerAgg[imp.ticker].volAnomalies++;
    });

    return Object.entries(tickerAgg)
      .map(([ticker, d]) => ({ ticker, ...d, avgScore: d.totalScore / d.count }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);
  }, [impacts]);

  const filteredImpacts = useMemo(() => {
    if (!selectedTicker) return impacts;
    return impacts.filter(i => i.ticker === selectedTicker);
  }, [impacts, selectedTicker]);

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '40px' }}>Carregando análise de impacto...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', position: 'relative' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px' }}>Análise de Impacto</h1>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Correlações</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', color: 'var(--text-primary)' }}>{stats.total}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confiança Média</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', color: 'var(--accent)' }}>{(stats.avgConf * 100).toFixed(1)}%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Anomalias Vol</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', color: 'var(--signal-down)' }}>{stats.anomalies}</span>
            </div>
          </div>
        </div>
        {selectedTicker && (
          <button 
            onClick={() => setSelectedTicker(null)}
            style={{ 
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
              padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', cursor: 'pointer'
            }}
          >
            LIMPAR FILTRO: {selectedTicker}
          </button>
        )}
      </div>

      {/* Ticker Ranking Cards */}
      <section>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
          Top Ativos em Exposição
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {ranked.map((r) => (
            <div
              key={r.ticker}
              onClick={() => setSelectedTicker(r.ticker)}
              style={{
                padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                cursor: 'pointer', transition: 'border-color 0.2s',
                borderColor: selectedTicker === r.ticker ? 'var(--accent)' : 'var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{r.ticker}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Score {r.avgScore.toFixed(3)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                  {r.count} eventos <br />
                  {r.volAnomalies > 0 && <span style={{ color: 'var(--signal-down)' }}>{r.volAnomalies} anomalias vol</span>}
                </div>
                <Sparkline 
                  data={prices.filter(p => p.ticker === r.ticker).slice(0, 10).map(p => p.close).reverse()} 
                  width={60} height={20}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Impact Table */}
      <section>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
          Eventos de Impacto {selectedTicker ? `para ${selectedTicker}` : ''}
        </div>
        <div style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 1fr 80px 80px 60px 80px 80px', gap: '12px', padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase'
          }}>
            <span>Ativo</span>
            <span>Manchete</span>
            <span style={{ textAlign: 'right' }}>Δ 1d</span>
            <span style={{ textAlign: 'right' }}>Δ 5d</span>
            <span style={{ textAlign: 'right' }}>Vol</span>
            <span style={{ textAlign: 'center' }}>Score</span>
            <span style={{ textAlign: 'right' }}>Conf</span>
          </div>
          {filteredImpacts.map((imp) => (
            <div
              key={imp.id}
              onClick={() => setSelectedImpact(imp)}
              style={{
                display: 'grid', gridTemplateColumns: '80px 1fr 80px 80px 60px 80px 80px', gap: '12px', padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(150, 85, 44, 0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{imp.ticker}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{imp.cronos_articles?.title}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {imp.cronos_articles?.source} · {timeAgo(imp.cronos_articles?.published_at || '')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}><Delta value={imp.delta_1d} /></div>
              <div style={{ textAlign: 'right' }}><Delta value={imp.delta_5d} /></div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: imp.volume_anomaly ? 'var(--signal-down)' : 'var(--text-tertiary)' }}>{imp.volume_ratio?.toFixed(1)}x</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '60px', height: '4px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(imp.impact_score * 100, 100)}%`, height: '100%', background: 'var(--accent)' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <ConfidenceGauge value={imp.confidence || 0} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Impact Detail Drawer */}
      {selectedImpact && (
        <>
          <div 
            onClick={() => setSelectedImpact(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100 }}
          />
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: '500px', background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border-subtle)', zIndex: 101, padding: '32px', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase' }}>Detalhes do Impacto</div>
              <button onClick={() => setSelectedImpact(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>

            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', lineHeight: 1.3, marginBottom: '12px' }}>{selectedImpact.cronos_articles?.title}</h2>
              <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{selectedImpact.cronos_articles?.source}</span>
                <span>{new Date(selectedImpact.cronos_articles?.published_at || '').toLocaleString('pt-BR')}</span>
              </div>
            </div>

            {/* Transmission Chain */}
            <div style={{ padding: '20px', background: 'var(--bg)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center' }}>Fluxo de Transmissão</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📰</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-primary)' }}>Artigo</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: selectedImpact.sentiment_score > 0 ? 'var(--signal-up)' : 'var(--signal-down)' }}>
                    {selectedImpact.sentiment_score > 0 ? 'Positivo' : 'Negativo'}
                  </div>
                </div>
                <div style={{ color: 'var(--border-subtle)' }}>──▶</div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🏢</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-primary)' }}>Entidade</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
                    {entities.find(e => e.id === selectedImpact.entity_id)?.sector || 'Setor N/A'}
                  </div>
                </div>
                <div style={{ color: 'var(--border-subtle)' }}>──▶</div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📈</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-primary)' }}>{selectedImpact.ticker}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: (selectedImpact.delta_1d || 0) > 0 ? 'var(--signal-up)' : 'var(--signal-down)' }}>
                    Δ1d: {selectedImpact.delta_1d?.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Confiança no Score</span>
                  <span style={{ color: 'var(--text-primary)' }}>{(selectedImpact.confidence * 100).toFixed(1)}%</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'var(--bg)', borderRadius: '2px' }}>
                  <div style={{ width: `${selectedImpact.confidence * 100}%`, height: '100%', background: 'var(--accent)' }} />
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Score baseado em: <br />
                <span style={{ color: 'var(--text-secondary)' }}>
                  Sentiment ({selectedImpact.sentiment_score.toFixed(2)}) × 
                  Trust ({selectedImpact.source_trust.toFixed(2)}) × 
                  Volume ({(selectedImpact.volume_ratio || 1).toFixed(1)}x)
                </span>
              </div>
            </div>

            {/* Price Chart */}
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Evolução de Preço (Janela do Evento)</div>
              <div style={{ padding: '16px', background: 'var(--bg)', border: '1px solid var(--border-subtle)', borderRadius: '4px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkline 
                  data={prices.filter(p => p.ticker === selectedImpact.ticker).slice(0, 15).map(p => p.close).reverse()} 
                  width={400} height={100}
                />
              </div>
            </div>

            <a 
              href={selectedImpact.cronos_articles?.url} 
              target="_blank" rel="noopener"
              style={{
                marginTop: 'auto', textAlign: 'center', padding: '12px', background: 'var(--accent)', color: 'var(--bg)',
                textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, borderRadius: '4px'
              }}
            >
              LER ARTIGO COMPLETO
            </a>
          </div>
        </>
      )}

      {/* Style overrides for standard components */}
      <style>{`
        body { background: var(--bg); color: var(--text-primary); }
        .interactive:hover { border-color: var(--accent) !important; }
      `}</style>
    </div>
  );
}
