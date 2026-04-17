'use client';
import { useState, useEffect } from 'react';
import type { Simulation, Prediction, ScenarioCase } from '@/lib/types';

function DirectionIcon({ dir }: { dir: string }) {
  if (dir === 'up') return <span className="text-emerald-400 text-lg">↑</span>;
  if (dir === 'down') return <span className="text-red-400 text-lg">↓</span>;
  return <span className="text-gray-400 text-lg">→</span>;
}

function ProbBar({ prob }: { prob: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 bg-gray-800 rounded-full h-2">
        <div
          className="bg-cyan-500 h-2 rounded-full"
          style={{ width: `${prob * 100}%` }}
        />
      </div>
      <span className="text-xs font-mono text-gray-400">{(prob * 100).toFixed(0)}%</span>
    </div>
  );
}

export default function SimulatePage() {
  const [scenario, setScenario] = useState('');
  const [tickers, setTickers] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selected, setSelected] = useState<Simulation | null>(null);

  useEffect(() => {
    fetch('/api/cronos/simulate')
      .then((r) => r.json())
      .then(setSimulations)
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenario.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/cronos/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          tickers: tickers.split(',').map((t) => t.trim()).filter(Boolean),
          config: { agents: 50, rounds: 3 },
        }),
      });
      const data = await res.json();

      // Refresh list
      const listRes = await fetch('/api/cronos/simulate');
      setSimulations(await listRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setScenario('');
    }
  };

  const result = selected?.result;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-200 tracking-tight">Simulações</h1>
          <span className="text-[10px] text-purple-600 border border-purple-800/50 rounded px-1.5 py-0.5">
            MiroFish
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="border border-gray-800/60 rounded-lg p-4 bg-[#0d0d14] space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Cenário</label>
            <textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-cyan-700 focus:outline-none resize-none"
              placeholder="Ex: Petrobras anuncia dividendos extraordinários de R$10 bilhões..."
              rows={3}
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Tickers (opcional)</label>
            <input
              value={tickers}
              onChange={(e) => setTickers(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-cyan-700 focus:outline-none"
              placeholder="PETR4, VALE3, ITUB4"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !scenario.trim()}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm text-white transition-colors"
          >
            {loading ? '◈ Simulando...' : '◈ Iniciar Simulação'}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Predictions */}
            <div className="border border-gray-800/60 rounded-lg p-4 bg-[#0d0d14]">
              <h2 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Previsões</h2>
              <div className="space-y-3">
                {result.predictions?.map((pred: Prediction, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded">
                    <DirectionIcon dir={pred.direction} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-mono text-sm font-bold">{pred.ticker}</span>
                        <span className="text-[10px] text-gray-500">{pred.timeframe}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          pred.magnitude === 'large' ? 'bg-red-900/50 text-red-400' :
                          pred.magnitude === 'moderate' ? 'bg-amber-900/50 text-amber-400' :
                          'bg-gray-800 text-gray-400'
                        }`}>{pred.magnitude}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{pred.reasoning}</p>
                    </div>
                    <ProbBar prob={pred.probability} />
                  </div>
                ))}
              </div>
            </div>

            {/* Scenarios */}
            <div className="border border-gray-800/60 rounded-lg p-4 bg-[#0d0d14]">
              <h2 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Cenários</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {result.scenarios?.map((sc: ScenarioCase, i: number) => (
                  <div key={i} className="p-3 bg-gray-900/50 rounded border border-gray-800/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-200">{sc.name}</span>
                      <span className="text-xs font-mono text-cyan-400">{(sc.probability * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{sc.description}</p>
                    <div className="space-y-1">
                      {sc.catalysts?.map((c, j) => (
                        <div key={j} className="text-[10px] text-gray-500 flex items-center gap-1">
                          <span className="text-cyan-700">→</span> {c}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Interactions */}
            {result.agent_interactions && (
              <div className="border border-gray-800/60 rounded-lg p-4 bg-[#0d0d14]">
                <h2 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Dinâmica dos Agentes</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Consenso</span>
                    <span className="text-cyan-400 font-mono">{(result.agent_interactions.consensus_level * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Mais influente</span>
                    <span className="text-gray-200">{result.agent_interactions.most_influential}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-gray-500 block mb-1">Pontos-chave do debate</span>
                    {result.agent_interactions.key_debate_points?.map((p: string, i: number) => (
                      <div key={i} className="text-xs text-gray-400 flex items-start gap-1 mb-1">
                        <span className="text-amber-700 mt-0.5">•</span> {p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar: History */}
      <aside className="space-y-3">
        <h2 className="text-[10px] text-gray-500 uppercase tracking-widest">Histórico</h2>
        {simulations.map((sim) => (
          <button
            key={sim.id}
            onClick={() => setSelected(sim)}
            className={`w-full text-left p-3 rounded border transition-colors ${
              selected?.id === sim.id
                ? 'border-purple-700 bg-purple-900/20'
                : 'border-gray-800/40 bg-[#0d0d14] hover:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                sim.status === 'completed' ? 'bg-emerald-900/50 text-emerald-400' :
                sim.status === 'pending' ? 'bg-amber-900/50 text-amber-400' :
                sim.status === 'failed' ? 'bg-red-900/50 text-red-400' :
                'bg-gray-800 text-gray-400'
              }`}>{sim.status}</span>
              <span className="text-[10px] text-gray-600">{new Date(sim.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
            <p className="text-xs text-gray-300 line-clamp-2">{sim.scenario}</p>
            {sim.tickers?.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {sim.tickers.map((t) => (
                  <span key={t} className="text-[10px] text-cyan-600 bg-cyan-900/20 rounded px-1">{t}</span>
                ))}
              </div>
            )}
          </button>
        ))}
        {simulations.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">Nenhuma simulação ainda.</p>
        )}
      </aside>
    </div>
  );
}
