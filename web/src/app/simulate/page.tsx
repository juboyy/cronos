'use client';
import { useState, useEffect, useRef } from 'react';

import { Simulation, Macro, Impact, Sentiment, Prediction, ScenarioCase } from '@/lib/types';

interface MarketContext { macro: Record<string, Macro>; topMovers: { ticker: string; delta: number }[]; sentiment: { avg: number; posPct: number; negPct: number }; recentNews: string[]; }

const SCENARIO_PRESETS = [
  { label: 'Selic +0.5%', scenario: 'O Copom decide elevar a Selic em 50 bps para conter inflação persistente', tickers: 'ITUB4, BBDC4, BBAS3, B3SA3' },
  { label: 'Dólar a R$6', scenario: 'Crise de confiança fiscal leva o dólar a romper R$6.00 com fuga de capital estrangeiro', tickers: 'PETR4, VALE3, SUZB3, EMBR3' },
  { label: 'Petróleo +20%', scenario: 'Escalada no Oriente Médio leva petróleo Brent acima de US$100 por barril', tickers: 'PETR4, PRIO3, CSAN3, UGPA3' },
  { label: 'Recessão Global', scenario: 'Dados econômicos confirmam recessão nos EUA e Europa, commodities desabam', tickers: 'VALE3, CSNA3, SUZB3, ABEV3' },
];

export default function SimulatePage() {
  const [scenario, setScenario] = useState('');
  const [tickers, setTickers] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [active, setActive] = useState<Simulation | null>(null);
  const [market, setMarket] = useState<MarketContext | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Load simulations
    fetch('/api/cronos/simulate').then(r => r.json()).then((sims) => {
      if (Array.isArray(sims)) {
        setSimulations(sims);
        const completed = sims.find((s: Simulation) => s.status === 'completed' && s.result);
        if (completed) setActive(completed);
      }
    }).catch(() => {});

    // Load market context for intelligent pre-fill
    Promise.all([
      fetch('/api/cronos/macro').then(r => r.json()).catch(() => []),
      fetch('/api/cronos/impact').then(r => r.json()).catch(() => []),
      fetch('/api/cronos/sentiment').then(r => r.json()).catch(() => []),
    ]).then(([macro, impacts, sentiments]: [Macro[], Impact[], Sentiment[]]) => {
      const macroMap: Record<string, Macro> = {};
      if (Array.isArray(macro)) for (const m of macro) { if (!macroMap[m.indicator]) macroMap[m.indicator] = m; }

      const scores = Array.isArray(sentiments) ? sentiments.map((s: Sentiment) => s.score).filter(Boolean) : [];
      const avg = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

      const topMovers = Array.isArray(impacts) ? impacts.slice(0, 5).map((i: Impact) => ({ ticker: i.ticker, delta: i.delta_1d || 0 })) : [];

      setMarket({
        macro: macroMap,
        topMovers,
        sentiment: {
          avg,
          posPct: scores.length > 0 ? Math.round(scores.filter((s: number) => s > 0.05).length / scores.length * 100) : 0,
          negPct: scores.length > 0 ? Math.round(scores.filter((s: number) => s < -0.05).length / scores.length * 100) : 0,
        },
        recentNews: [],
      });
    });
  }, []);

  const applyPreset = (preset: typeof SCENARIO_PRESETS[0]) => {
    setScenario(preset.scenario);
    setTickers(preset.tickers);
    textareaRef.current?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenario.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/cronos/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          tickers: tickers.split(',').map(t => t.trim()).filter(Boolean),
          market_data: market ? `Selic: ${market.macro.selic?.value || '?'}, USD/BRL: ${market.macro.usdbrl?.value || '?'}, Sentimento: ${market.sentiment.avg.toFixed(3)}, Top movers: ${market.topMovers.map(m => m.ticker).join(', ')}` : '',
          config: { agents: 50, rounds: 3 },
        }),
      });
      const data = await res.json();
      // API returns the simulation directly with report/agents/rounds
      // Transform to match Simulation interface
      const sim: Simulation = {
        id: data.simulation_id || `sim_${Date.now()}`,
        scenario: data.scenario || scenario,
        tickers: tickers.split(',').map(t => t.trim()).filter(Boolean),
        config: {},
        status: data.status || 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        result: {
          simulation_id: data.simulation_id || '',
          scenario: data.scenario || scenario,
          predictions: (data.report?.prediction ? [{
            ticker: tickers.split(',')[0]?.trim() || 'MARKET',
            direction: data.report.prediction.direction === 'bullish' ? 'up' : data.report.prediction.direction === 'bearish' ? 'down' : 'neutral',
            probability: data.report.prediction.confidence || 0.5,
            magnitude: data.report.prediction.expected_magnitude?.includes('high') ? 'large' : data.report.prediction.expected_magnitude?.includes('moderate') ? 'moderate' : 'small',
            reasoning: data.report.executive_summary || '',
            timeframe: data.report.prediction.time_horizon || 'curto prazo',
          }] : []) as Prediction[],
          scenarios: [
            { name: 'Bull Case', probability: data.report?.prediction?.probability_up || 0.3, description: data.report?.key_factors?.[0] || '', catalysts: data.report?.key_factors || [] },
            { name: 'Bear Case', probability: data.report?.prediction?.probability_down || 0.3, description: data.report?.risk_factors?.[0] || '', catalysts: data.report?.risk_factors || [] },
            { name: 'Base Case', probability: data.report?.prediction?.probability_neutral || 0.4, description: data.report?.actionable_insight || '', catalysts: data.report?.dissenting_views || [] },
          ] as ScenarioCase[],
          agent_interactions: {
            consensus_level: data.rounds?.[data.rounds.length - 1]?.consensus_strength || 0.5,
            most_influential: data.agents?.[0]?.name || 'N/A',
            strongest_disagreement: data.report?.dissenting_views?.[0] || '',
            key_debate_points: data.rounds?.map((r: { key_tension: string }) => r.key_tension).filter(Boolean) || [],
          },
          rounds: data.rounds?.map((r: { round: number; key_tension: string; consensus_direction: string; consensus_strength: number }) => ({
            round: r.round,
            key_arguments: [r.key_tension],
            emerging_consensus: r.consensus_direction,
            sentiment_shift: r.consensus_strength,
          })) || [],
          confidence: data.report?.prediction?.confidence || 0.5,
          caveats: data.report?.risk_factors || [],
        },
      };
      setSimulations(prev => [sim, ...prev]);
      setActive(sim);
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

      {/* ── MARKET CONTEXT ── */}
      {market && (
        <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
          {Object.entries(market.macro).slice(0, 4).map(([key, m]: [string, Macro]) => (
            <div key={key} style={{ flex: '1 1 100px', padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ ...S.label, marginBottom: '2px' }}>{key}</div>
              <div style={{ ...S.mono, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{typeof m.value === 'number' ? m.value.toFixed(2) : m.value}</div>
            </div>
          ))}
          {market.topMovers.length > 0 && (
            <div style={{ flex: '1 1 160px', padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ ...S.label, marginBottom: '2px' }}>Top Impacto</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {market.topMovers.slice(0, 3).map(m => (
                  <span key={m.ticker} style={{ ...S.mono, fontSize: '0.6875rem', color: 'var(--text-primary)' }}>{m.ticker}</span>
                ))}
              </div>
            </div>
          )}
          <div style={{ flex: '1 1 120px', padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ ...S.label, marginBottom: '2px' }}>Sentimento</div>
            <div style={{ ...S.mono, fontSize: '0.875rem', color: market.sentiment.avg > 0.05 ? 'var(--signal-up)' : market.sentiment.avg < -0.05 ? 'var(--signal-down)' : 'var(--signal-neutral)' }}>
              {market.sentiment.avg > 0 ? '+' : ''}{market.sentiment.avg.toFixed(3)}
            </div>
          </div>
        </div>
      )}

      {/* ── PRESETS ── */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {SCENARIO_PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => applyPreset(p)}
            className="interactive"
            style={{
              ...S.mono, fontSize: '0.625rem',
              padding: '5px 10px',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              transition: 'all 150ms',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {p.label}
          </button>
        ))}
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
                    {r.predictions.map((p: Prediction, i: number) => (
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
                    {r.scenarios.map((sc: ScenarioCase, i: number) => (
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
