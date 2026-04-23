'use client';

import { useState, useEffect, useCallback } from 'react';

const PROXY_URL = '/api/engines/bettafish';

interface EngineStatus {
  backend: 'loading' | 'online' | 'offline';
  started: boolean;
  subEngines: Record<string, { status: string; port: number | null }>;
}

interface SearchResult {
  source: string;
  success: boolean;
  data?: unknown;
  message?: string;
}

export default function BettaFishPage() {
  const [engine, setEngine] = useState<EngineStatus>({ backend: 'loading', started: false, subEngines: {} });
  const [view, setView] = useState<'search' | 'forum' | 'graph' | 'status'>('search');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string, SearchResult> | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [forumLog, setForumLog] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [graphData, setGraphData] = useState<any>(null);

  const checkHealth = useCallback(async () => {
    setEngine(prev => ({ ...prev, backend: 'loading' }));
    const [proxyData, statusData] = await Promise.all([
      fetch(PROXY_URL, { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/engines/bettafish/status', { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    setEngine({
      backend: proxyData?.backend ?? 'offline',
      started: proxyData?.started ?? false,
      subEngines: statusData?.engines ?? {},
    });
  }, []);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchResults(null);
    const res = await fetch('/api/engines/bettafish/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setSearchResults(data.results ?? {});
    } else {
      setSearchResults({ error: { source: 'system', success: false, message: 'Falha na conexão' } });
    }
    setSearchLoading(false);
  };

  const loadForum = async () => {
    const res = await fetch('/api/engines/bettafish/forum').catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setForumLog(data.lines ?? []);
    }
  };

  const loadGraph = async () => {
    const res = await fetch('/api/engines/bettafish/graph?action=summary').catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setGraphData(data.success ? data : null);
    }
  };

  const startEngines = async () => {
    const res = await fetch(PROXY_URL, { method: 'POST' }).catch(() => null);
    if (res?.ok) {
      setTimeout(checkHealth, 3000);
    }
  };

  const statusColor = engine.backend === 'online' ? '#22c55e' : engine.backend === 'offline' ? '#ef4444' : '#facc15';
  const statusLabel = engine.backend === 'online' ? (engine.started ? '● ATIVO' : '● PARADO') : engine.backend === 'offline' ? '● OFFLINE' : '● VERIFICANDO';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <div style={{ padding: '20px clamp(16px, 3vw, 40px)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.5rem' }}>🐟</span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>BettaFish</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', letterSpacing: '0.04em', margin: 0 }}>Motor de Análise de Opinião Multi-Agente</p>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}>{statusLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '2px' }}>
          {([
            { id: 'search' as const, label: 'Busca' },
            { id: 'forum' as const, label: 'Fórum', onSwitch: loadForum },
            { id: 'graph' as const, label: 'Grafo', onSwitch: loadGraph },
            { id: 'status' as const, label: 'Status' },

          ]).map(v => (
            <button key={v.id} onClick={() => { setView(v.id); v.onSwitch?.(); }}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', transition: 'all 150ms', background: view === v.id ? 'var(--accent)' : 'transparent', color: view === v.id ? '#000' : 'var(--text-tertiary)' }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: view === 'full' ? 0 : '24px clamp(16px, 3vw, 40px)' }}>
        {view === 'search' && (
          <div style={{ maxWidth: '800px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Busca Multi-Motor</h2>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>Consulta simultânea em Insight, Media, Query e Forum engines.</p>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <input
                type="text"
                placeholder="Ex: Petrobras dividendos, Selic impacto varejo..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
                autoFocus
                style={{ flex: 1, padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }}
              />
              <button
                onClick={runSearch}
                disabled={searchLoading || !query.trim() || engine.backend !== 'online'}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', padding: '12px 24px', borderRadius: 'var(--radius)', border: 'none', background: engine.backend === 'online' ? 'var(--accent)' : 'var(--bg-card)', color: engine.backend === 'online' ? '#000' : 'var(--text-muted)', cursor: engine.backend === 'online' ? 'pointer' : 'not-allowed', fontWeight: 'bold', textTransform: 'uppercase', opacity: searchLoading ? 0.6 : 1 }}
              >
                {searchLoading ? '...' : 'Buscar'}
              </button>
            </div>

            {searchResults && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(searchResults).map(([key, val]) => {
                  // Determine content: val can be a SearchResult {source,success,data,message}
                  // or raw data from Gemini (string, array, object with summary, etc.)
                  const isLegacy = val && typeof val === 'object' && 'success' in val;
                  const hasData = val !== null && val !== undefined && 
                    !(Array.isArray(val) && val.length === 0) &&
                    !(typeof val === 'object' && Object.keys(val).length === 0);
                  const isEmpty = !hasData;

                  let content = '';
                  if (isLegacy) {
                    content = val.message || (val.data ? JSON.stringify(val.data, null, 2) : 'Sem dados');
                  } else if (typeof val === 'string') {
                    content = val;
                  } else if (Array.isArray(val)) {
                    if (val.length === 0) {
                      content = 'Nenhum resultado encontrado';
                    } else {
                      content = val.map((item, i) => {
                        if (typeof item === 'string') return `${i + 1}. ${item}`;
                        if (item.role) return `[${item.role.toUpperCase()}] ${item.argument || ''} (confiança: ${Math.round((item.confidence || 0) * 100)}%)`;
                        if (item.title) return `• ${item.title} (${item.source || ''}) — relevância: ${Math.round((item.relevance || 0) * 100)}%`;
                        return JSON.stringify(item, null, 2);
                      }).join('\n');
                    }
                  } else if (typeof val === 'object' && val !== null) {
                    if (val.summary) {
                      const parts = [val.summary];
                      if (val.sentiment) parts.push(`\nSentimento: ${val.sentiment} (${Math.round((val.confidence || 0) * 100)}%)`);
                      if (val.key_factors?.length) parts.push(`Fatores: ${val.key_factors.join(', ')}`);
                      if (val.affected_tickers?.length) parts.push(`Tickers: ${val.affected_tickers.join(', ')}`);
                      content = parts.join('\n');
                    } else {
                      content = JSON.stringify(val, null, 2);
                    }
                  } else {
                    content = 'Sem dados';
                  }

                  const statusOk = isLegacy ? val.success : hasData;

                  return (
                    <div key={key} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: statusOk ? '#22c55e' : (isEmpty ? 'var(--text-muted)' : '#ef4444') }}>
                          {statusOk ? '✓' : (isEmpty ? '—' : '✗')}
                        </span>
                      </div>
                      <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, maxHeight: '300px', overflow: 'auto', lineHeight: '1.5' }}>
                        {content}
                      </pre>
                    </div>
                  );
                })}
              </div>
            )}

            {!searchResults && engine.backend === 'offline' && (
              <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '40px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Engine offline. Inicie os motores para buscar.</p>
                <button onClick={startEngines} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', padding: '10px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#000', cursor: 'pointer', fontWeight: 'bold' }}>
                  Iniciar Motores
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'forum' && (
          <div style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: 'var(--text-primary)' }}>Fórum de Discussão</h2>
              <button onClick={loadForum} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Atualizar</button>
            </div>
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '16px', border: '1px solid var(--border-subtle)', maxHeight: '500px', overflow: 'auto' }}>
              {forumLog.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Sem atividade no fórum.</p>
              ) : (
                forumLog.map((line, i) => (
                  <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-secondary)', padding: '4px 0', borderBottom: i < forumLog.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>{line}</div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'graph' && (
          <div style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: 'var(--text-primary)' }}>Grafo de Conhecimento — Memgraph</h2>
              <button onClick={loadGraph} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Atualizar</button>
            </div>
            {!graphData ? (
              <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '40px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Carregando grafo...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Node counts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                  {(graphData.nodes || []).map((n: { label: string; cnt: number }) => (
                    <div key={n.label} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', color: 'var(--accent)', fontWeight: 'bold' }}>{n.cnt.toLocaleString('pt-BR')}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>{n.label}</div>
                    </div>
                  ))}
                </div>
                {/* Relationship counts */}
                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase' }}>Relacionamentos</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(graphData.relationships || []).map((r: { rel: string; cnt: number }) => (
                      <span key={r.rel} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-secondary)', padding: '4px 10px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px' }}>
                        {r.rel}: {r.cnt}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'status' && (
          <div style={{ maxWidth: '900px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {Object.entries(engine.subEngines).length > 0 ? (
                Object.entries(engine.subEngines).map(([name, info]) => (
                  <div key={name} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>{name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: info.status === 'running' ? '#22c55e' : '#ef4444' }}>
                        {info.status === 'running' ? '● ATIVO' : '● PARADO'}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)' }}>Porta: {info.port ?? 'N/A'}</span>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '20px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Carregando status dos sub-motores...</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={checkHealth} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Atualizar Status
              </button>
              {!engine.started && (
                <button onClick={startEngines} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#000', cursor: 'pointer', fontWeight: 'bold' }}>
                  Iniciar Motores
                </button>
              )}
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
