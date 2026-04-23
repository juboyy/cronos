'use client';

import { useState, useEffect, useCallback } from 'react';

const PROXY_URL = '/api/engines/mirofish';
// Engine now runs serverless — no external frontend needed

interface EngineStatus {
  backend: 'loading' | 'online' | 'offline';
  simulations: number;
}

interface SimulationForm {
  topic: string;
  context: string;
}

interface ProjectItem {
  id: string;
  name: string;
  status: string;
}

export default function MiroFishPage() {
  const [engine, setEngine] = useState<EngineStatus>({ backend: 'loading', simulations: 0 });
  const [view, setView] = useState<'simulator' | 'projects' | 'status' | 'full'>('simulator');
  const [form, setForm] = useState<SimulationForm>({ topic: '', context: '' });
  const [simResult, setSimResult] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [simData, setSimData] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    setEngine(prev => ({ ...prev, backend: 'loading' }));
    const data = await fetch(PROXY_URL, { signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? r.json() : null).catch(() => null);
    setEngine({
      backend: data?.backend ?? 'offline',
      simulations: data?.simulations ?? 0,
    });
  }, []);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  const loadProjects = async () => {
    setProjectsLoading(true);
    const res = await fetch('/api/engines/mirofish/projects').catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setProjects(data.projects ?? []);
    }
    setProjectsLoading(false);
  };

  const runSimulation = async () => {
    if (!form.topic.trim()) return;
    setSimLoading(true);
    setSimResult(null);
    const res = await fetch('/api/engines/mirofish/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: form.topic, context: form.context }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setSimData(data.prediction ? data : null);
      setSimResult(data.prediction ? null : (data.result ?? JSON.stringify(data, null, 2)));
    } else {
      setSimResult('Erro ao executar simulação. Verifique os logs.');
      setSimData(null);
    }
    setSimLoading(false);
  };

  const statusColor = engine.backend === 'online' ? '#22c55e' : engine.backend === 'offline' ? '#ef4444' : '#facc15';
  const statusLabel = engine.backend === 'online' ? '● ONLINE' : engine.backend === 'offline' ? '● OFFLINE' : '● VERIFICANDO';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <div style={{ padding: '20px clamp(16px, 3vw, 40px)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.5rem' }}>🦈</span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>MiroFish</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', letterSpacing: '0.04em', margin: 0 }}>Motor de Predição por Inteligência de Enxame</p>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}>{statusLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '2px' }}>
          {([
            { id: 'simulator' as const, label: 'Simulador' },
            { id: 'projects' as const, label: 'Projetos' },
            { id: 'status' as const, label: 'Status' },
            { id: 'full' as const, label: '↗ Interface' },
          ]).map(v => (
            <button key={v.id} onClick={() => { setView(v.id); if (v.id === 'projects') loadProjects(); }}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', transition: 'all 150ms', background: view === v.id ? 'var(--accent)' : 'transparent', color: view === v.id ? '#000' : 'var(--text-tertiary)' }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: view === 'full' ? 0 : '24px clamp(16px, 3vw, 40px)' }}>
        {view === 'simulator' && (
          <div style={{ maxWidth: '800px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Simulação Preditiva</h2>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>Crie cenários e explore projeções baseadas em inteligência coletiva de agentes.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tópico</label>
                <input
                  type="text"
                  placeholder="Ex: Impacto da Selic a 14.75% no setor imobiliário"
                  value={form.topic}
                  onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  style={{ width: '100%', padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contexto Adicional (opcional)</label>
                <textarea
                  placeholder="Cole dados, notícias, ou análises relevantes..."
                  value={form.context}
                  onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
                  rows={4}
                  style={{ width: '100%', padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
                />
              </div>
              <button
                onClick={runSimulation}
                disabled={simLoading || !form.topic.trim() || engine.backend !== 'online'}
                style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', padding: '10px 24px', borderRadius: 'var(--radius)', border: 'none', background: engine.backend === 'online' ? 'var(--accent)' : 'var(--bg-card)', color: engine.backend === 'online' ? '#000' : 'var(--text-muted)', cursor: engine.backend === 'online' ? 'pointer' : 'not-allowed', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: simLoading ? 0.6 : 1 }}
              >
                {simLoading ? 'Processando...' : 'Executar Simulação'}
              </button>
            </div>

            {/* Structured result */}
            {simData && simData.prediction && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Prediction Header */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.5rem' }}>{simData.prediction.direction === 'bearish' ? '📉' : simData.prediction.direction === 'bullish' ? '📈' : '➡️'}</span>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: simData.prediction.direction === 'bearish' ? '#ef4444' : simData.prediction.direction === 'bullish' ? '#22c55e' : 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase' }}>{simData.prediction.direction}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)' }}>{simData.prediction.time_horizon} · {simData.prediction.expected_magnitude}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', color: 'var(--accent)', fontWeight: 700 }}>{Math.round(simData.prediction.confidence * 100)}%</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)' }}>CONFIANÇA</div>
                    </div>
                  </div>
                  {/* Probability bars */}
                  <div style={{ display: 'flex', gap: '2px', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${(simData.prediction.probability_up || 0) * 100}%`, background: '#22c55e', transition: 'width 500ms' }} />
                    <div style={{ flex: 1, background: 'var(--border-subtle)' }} />
                    <div style={{ width: `${(simData.prediction.probability_down || 0) * 100}%`, background: '#ef4444', transition: 'width 500ms' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: '#22c55e' }}>↑ {Math.round((simData.prediction.probability_up || 0) * 100)}%</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: '#ef4444' }}>↓ {Math.round((simData.prediction.probability_down || 0) * 100)}%</span>
                  </div>
                </div>

                {/* Executive Summary */}
                {simData.executive_summary && (
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: '20px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Sumário Executivo</div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{simData.executive_summary}</p>
                  </div>
                )}

                {/* Agents Grid */}
                {simData.agents?.length > 0 && (
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: '20px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Agentes ({simData.agents.length})</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                      {simData.agents.map((a: { id: string; name: string; archetype: string; final_bias?: string; bias?: string; confidence: number; key_argument?: string; reasoning?: string }) => (
                        <div key={a.id} style={{ padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${(a.final_bias || a.bias) === 'bearish' ? '#ef4444' : (a.final_bias || a.bias) === 'bullish' ? '#22c55e' : '#eab308'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-primary)', fontWeight: 600 }}>{a.name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: (a.final_bias || a.bias) === 'bearish' ? '#ef4444' : (a.final_bias || a.bias) === 'bullish' ? '#22c55e' : '#eab308', textTransform: 'uppercase' }}>{a.final_bias || a.bias}</span>
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)', marginBottom: '6px' }}>{a.archetype}</div>
                          <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{(a.key_argument || a.reasoning || '').slice(0, 120)}{(a.key_argument || a.reasoning || '').length > 120 ? '...' : ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Factors + Risks */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {simData.key_factors?.length > 0 && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: '16px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Fatores-Chave</div>
                      {simData.key_factors.map((f: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'baseline', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--accent)', fontSize: '0.625rem' }}>→</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {simData.risk_factors?.length > 0 && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: '16px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Riscos</div>
                      {simData.risk_factors.map((f: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'baseline', marginBottom: '4px' }}>
                          <span style={{ color: '#ef4444', fontSize: '0.625rem' }}>⚠</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actionable Insight */}
                {simData.actionable_insight && (
                  <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 'var(--radius)', padding: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1rem' }}>💡</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Insight Acionável</div>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>{simData.actionable_insight}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fallback: raw text result */}
            {simResult && !simData && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: '20px' }}>
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>Resultado</h3>
                <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6', margin: 0 }}>{simResult}</pre>
              </div>
            )}

            <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Simulações</span>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', color: 'var(--accent)', margin: '4px 0 0' }}>{engine.simulations}</p>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Motor</span>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-primary)', margin: '4px 0 0' }}>Gemini 2.0 Flash</p>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Arquitetura</span>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-primary)', margin: '4px 0 0' }}>Enxame Multi-Agente</p>
              </div>
            </div>
          </div>
        )}

        {view === 'projects' && (
          <div style={{ maxWidth: '800px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '16px' }}>Projetos de Simulação</h2>
            {projectsLoading ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Carregando...</p>
            ) : projects.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '40px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Nenhum projeto criado ainda.</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)' }}>Use o Simulador para criar sua primeira predição.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {projects.map(p => (
                  <div key={p.id} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '16px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)' }}>{p.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)' }}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'status' && (
          <div style={{ maxWidth: '900px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Backend API', status: engine.backend },
                { label: 'Simulações Ativas', value: engine.simulations },
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '20px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
                    {'status' in s && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: s.status === 'online' ? '#22c55e' : '#ef4444' }}>{s.status === 'online' ? '● ONLINE' : '● OFFLINE'}</span>}
                    {'value' in s && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', color: 'var(--accent)' }}>{s.value}</span>}
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Endpoints Disponíveis</h3>
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {['GET  /health', 'GET  /api/simulation/list', 'POST /api/simulation/create', 'POST /api/graph/build', 'POST /api/graph/ontology/generate', 'GET  /api/graph/project/list'].map(ep => (
                  <span key={ep}>{ep}</span>
                ))}
              </div>
            </div>

            <button onClick={checkHealth} style={{ marginTop: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Atualizar Status
            </button>
          </div>
        )}

        {view === 'full' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '3rem' }}>🦈</span>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MiroFish v2.0 — Modo Serverless</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', maxWidth: '400px', textAlign: 'center' }}>Engine roda diretamente nas API routes (Gemini 2.0 Flash). Use o Simulador para executar predições.</p>
          </div>
        )}
      </div>
    </div>
  );
}
