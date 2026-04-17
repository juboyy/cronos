'use client';
import { useState, useEffect, useRef } from 'react';

interface Simulation { id: string; scenario: string; tickers: string[]; status: string; result: any; created_at: string; }

export default function SimulatePage() {
  const [scenario, setScenario] = useState('');
  const [tickers, setTickers] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [active, setActive] = useState<Simulation | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/cronos/simulate').then(r => r.json()).then(setSimulations).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenario.trim() || loading) return;
    setLoading(true);
    try {
      await fetch('/api/cronos/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          tickers: tickers.split(',').map(t => t.trim()).filter(Boolean),
          config: { agents: 50, rounds: 3 },
        }),
      });
      const list = await fetch('/api/cronos/simulate').then(r => r.json());
      setSimulations(list);
      setScenario('');
      setTickers('');
    } finally { setLoading(false); }
  };

  const r = active?.result;

  const S = {
    label: { fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
    mono: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' as const },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--text-primary)' }}>Simulate</h1>
        <span style={{ ...S.label }}>MiroFish Swarm Engine</span>
      </div>

      {/* ── INPUT ── */}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            value={scenario}
            onChange={e => setScenario(e.target.value)}
            placeholder="Descreva um cenário financeiro para simular..."
            rows={3}
            style={{
              width: '100%',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '14px 16px',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-display)',
              resize: 'none',
              outline: 'none',
              transition: 'border-color 150ms',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent-dim)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            value={tickers}
            onChange={e => setTickers(e.target.value)}
            placeholder="Tickers: PETR4, VALE3, ITUB4"
            style={{
              flex: 1,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8125rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading || !scenario.trim()}
            style={{
              padding: '10px 24px',
              background: loading ? 'var(--bg-elevated)' : 'var(--accent)',
              color: loading ? 'var(--text-muted)' : 'hsl(225 15% 4%)',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 150ms',
              textTransform: 'uppercase',
            }}
          >
            {loading ? 'Simulando...' : 'Simular'}
          </button>
        </div>
      </form>

      {/* ── LAYOUT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '40px', alignItems: 'start' }}>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {r ? (
            <>
              {/* Predictions */}
              {r.predictions?.length > 0 && (
                <section>
                  <div style={{ ...S.label, marginBottom: '14px' }}>Predictions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {r.predictions.map((p: any, i: number) => (
                      <div
                        key={i}
                        className="stagger"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '32px 70px 1fr 100px',
                          gap: '14px',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {/* Direction */}
                        <span style={{ fontSize: '1.25rem', color: p.direction === 'up' ? 'var(--signal-up)' : p.direction === 'down' ? 'var(--signal-down)' : 'var(--text-tertiary)', textAlign: 'center' }}>
                          {p.direction === 'up' ? '↑' : p.direction === 'down' ? '↓' : '→'}
                        </span>

                        {/* Ticker */}
                        <div>
                          <div style={{ ...S.mono, fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>{p.ticker}</div>
                          <div style={{ ...S.mono, fontSize: '0.5625rem', color: 'var(--text-muted)' }}>{p.timeframe}</div>
                        </div>

                        {/* Reasoning */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{p.reasoning}</div>

                        {/* Probability */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                          <span style={{ ...S.mono, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{(p.probability * 100).toFixed(0)}%</span>
                          <div style={{ width: '80px', height: '3px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${p.probability * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: '2px' }} />
                          </div>
                          <span style={{ ...S.mono, fontSize: '0.5625rem', color: p.magnitude === 'large' ? 'var(--signal-down)' : p.magnitude === 'moderate' ? 'var(--signal-neutral)' : 'var(--text-muted)' }}>
                            {p.magnitude}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Scenarios */}
              {r.scenarios?.length > 0 && (
                <section>
                  <div style={{ ...S.label, marginBottom: '14px' }}>Scenario Analysis</div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(r.scenarios.length, 3)}, 1fr)`, gap: '2px' }}>
                    {r.scenarios.map((sc: any, i: number) => (
                      <div
                        key={i}
                        className="stagger"
                        style={{
                          padding: '20px',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderTop: `2px solid ${
                            sc.name.toLowerCase().includes('bull') ? 'var(--signal-up)' :
                            sc.name.toLowerCase().includes('bear') ? 'var(--signal-down)' :
                            'var(--signal-neutral)'
                          }`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{sc.name}</span>
                          <span style={{ ...S.mono, fontSize: '0.8125rem', color: 'var(--accent)' }}>{(sc.probability * 100).toFixed(0)}%</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{sc.description}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {sc.catalysts?.map((c: string, j: number) => (
                            <div key={j} style={{ display: 'flex', gap: '6px', alignItems: 'baseline', fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                              <span style={{ color: 'var(--accent-dim)', flexShrink: 0 }}>→</span>
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Agent Dynamics */}
              {r.agent_interactions && (
                <section style={{ padding: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)' }}>
                  <div style={{ ...S.label, marginBottom: '14px' }}>Agent Dynamics</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <div style={{ ...S.label, marginBottom: '4px' }}>Consensus</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ ...S.mono, fontSize: '1.25rem', color: 'var(--text-primary)' }}>{(r.agent_interactions.consensus_level * 100).toFixed(0)}%</span>
                        <div style={{ flex: 1, height: '3px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${r.agent_interactions.consensus_level * 100}%`, height: '100%', background: 'var(--accent)' }} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ ...S.label, marginBottom: '4px' }}>Most Influential</div>
                      <span style={{ ...S.mono, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{r.agent_interactions.most_influential}</span>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ ...S.label, marginBottom: '8px' }}>Key Debate Points</div>
                      {r.agent_interactions.key_debate_points?.map((p: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'baseline', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--signal-neutral)', flexShrink: 0, ...S.mono, fontSize: '0.625rem' }}>{String(i + 1).padStart(2, '0')}</span>
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '8px' }}>◇</div>
              <div style={{ fontSize: '0.8125rem' }}>Selecione uma simulação ou crie uma nova.</div>
            </div>
          )}
        </div>

        {/* History sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'sticky', top: '68px' }}>
          <div style={{ ...S.label, marginBottom: '8px' }}>History</div>
          {simulations.map(sim => (
            <button
              key={sim.id}
              onClick={() => setActive(sim)}
              className="interactive"
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                background: active?.id === sim.id ? 'var(--bg-elevated)' : 'transparent',
                border: active?.id === sim.id ? '1px solid var(--border)' : '1px solid transparent',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{
                  ...S.mono,
                  fontSize: '0.5625rem',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-sm)',
                  background: sim.status === 'completed' ? 'hsl(150 50% 50% / 0.12)' : sim.status === 'pending' ? 'hsl(45 80% 50% / 0.12)' : 'hsl(0 60% 50% / 0.12)',
                  color: sim.status === 'completed' ? 'var(--signal-up)' : sim.status === 'pending' ? 'var(--signal-neutral)' : 'var(--signal-down)',
                }}>
                  {sim.status}
                </span>
                <span style={{ ...S.mono, fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
                  {new Date(sim.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                {sim.scenario}
              </div>
              {sim.tickers?.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {sim.tickers.map(t => (
                    <span key={t} style={{ ...S.mono, fontSize: '0.5625rem', color: 'var(--text-tertiary)', padding: '1px 4px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>{t}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
          {simulations.length === 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              Nenhuma simulação.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
