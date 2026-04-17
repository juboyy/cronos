import { supabaseQuery } from '@/lib/supabase';
import type { Impact } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getImpacts() {
  return supabaseQuery(
    'cronos_impacts',
    'select=*,cronos_articles(title,source,published_at)&order=impact_score.desc&limit=50'
  );
}

async function getTopTickers() {
  return supabaseQuery(
    'cronos_impacts',
    'select=ticker,impact_score&order=impact_score.desc&limit=100'
  );
}

function ScoreBar({ score }: { score: number }) {
  const w = Math.min(score * 100, 100);
  const color = score > 0.7 ? 'bg-red-500' : score > 0.4 ? 'bg-amber-500' : 'bg-cyan-600';
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${w}%` }} />
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === undefined) return <span className="text-gray-600 text-xs">—</span>;
  const color = delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-gray-400';
  return <span className={`text-xs font-mono ${color}`}>{delta > 0 ? '+' : ''}{delta.toFixed(2)}%</span>;
}

export default async function ImpactPage() {
  const [impacts, tickerData] = await Promise.all([getImpacts(), getTopTickers()]);

  // Aggregate by ticker for heatmap
  const tickerMap: Record<string, { count: number; avgScore: number; totalDelta: number }> = {};
  for (const t of tickerData) {
    if (!tickerMap[t.ticker]) tickerMap[t.ticker] = { count: 0, avgScore: 0, totalDelta: 0 };
    tickerMap[t.ticker].count++;
    tickerMap[t.ticker].avgScore += t.impact_score || 0;
  }
  const tickers = Object.entries(tickerMap)
    .map(([ticker, d]) => ({ ticker, count: d.count, avgScore: d.avgScore / d.count }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-gray-200 tracking-tight">Impacto</h1>
        <span className="text-[10px] text-amber-600 border border-amber-800/50 rounded px-1.5 py-0.5">
          {impacts.length} correlações
        </span>
      </div>

      {/* Heatmap */}
      <div className="border border-gray-800/60 rounded-lg p-4 bg-[#0d0d14]">
        <h2 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Heatmap — Score por Ticker</h2>
        <div className="flex flex-wrap gap-2">
          {tickers.map((t) => {
            const intensity = Math.min(t.avgScore * 1.5, 1);
            const bg = t.avgScore > 0.5
              ? `rgba(239, 68, 68, ${intensity})`
              : t.avgScore > 0.3
                ? `rgba(245, 158, 11, ${intensity})`
                : `rgba(6, 182, 212, ${intensity * 0.7})`;
            return (
              <a
                key={t.ticker}
                href={`/entity/${t.ticker}`}
                className="px-3 py-2 rounded text-xs font-mono transition-transform hover:scale-105"
                style={{ backgroundColor: bg }}
              >
                <div className="text-white font-bold">{t.ticker}</div>
                <div className="text-white/70 text-[10px]">{t.avgScore.toFixed(2)} ({t.count})</div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Impact Table */}
      <div className="border border-gray-800/60 rounded-lg bg-[#0d0d14] overflow-hidden">
        <div className="p-4 border-b border-gray-800/40">
          <h2 className="text-[10px] text-gray-500 uppercase tracking-widest">Top Impactos — Notícia × Preço</h2>
        </div>
        <div className="divide-y divide-gray-800/30">
          {impacts.map((imp: Impact) => (
            <div key={imp.id} className="px-4 py-3 hover:bg-gray-800/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-cyan-400 font-mono text-xs font-bold">{imp.ticker}</span>
                    <span className="text-gray-600 text-[10px]">{imp.cronos_articles?.source}</span>
                    {imp.volume_anomaly && (
                      <span className="text-[10px] text-red-400 border border-red-800/50 rounded px-1">VOL ⚠</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 truncate">{imp.cronos_articles?.title}</p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-600">Δ1d:</span>
                      <DeltaBadge delta={imp.delta_1d} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-600">Δ5d:</span>
                      <DeltaBadge delta={imp.delta_5d} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-600">Vol:</span>
                      <span className="text-xs font-mono text-gray-400">{imp.volume_ratio?.toFixed(1)}x</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 w-20">
                  <div className="text-sm font-mono text-amber-400 font-bold">{imp.impact_score?.toFixed(3)}</div>
                  <ScoreBar score={imp.impact_score} />
                  <div className="text-[10px] text-gray-600 mt-1">conf: {imp.confidence?.toFixed(0)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {impacts.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">◈</p>
          <p>Nenhum impacto calculado. Execute o impact scorer primeiro.</p>
        </div>
      )}
    </div>
  );
}
