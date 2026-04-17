import { supabaseQuery } from '@/lib/supabase';
import type { Pattern } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getPatterns() {
  return supabaseQuery('cronos_patterns', 'select=*&order=occurrences.desc&limit=50');
}

const TYPE_COLORS: Record<string, string> = {
  dividend: 'text-emerald-400 bg-emerald-900/30',
  earnings: 'text-amber-400 bg-amber-900/30',
  acquisition: 'text-purple-400 bg-purple-900/30',
  regulatory: 'text-red-400 bg-red-900/30',
  macro: 'text-blue-400 bg-blue-900/30',
  governance: 'text-orange-400 bg-orange-900/30',
  operational: 'text-cyan-400 bg-cyan-900/30',
  market: 'text-pink-400 bg-pink-900/30',
  general: 'text-gray-400 bg-gray-800',
};

export default async function PatternsPage() {
  const patterns = await getPatterns();

  // Group by ticker
  const grouped: Record<string, Pattern[]> = {};
  for (const p of patterns) {
    if (!grouped[p.ticker]) grouped[p.ticker] = [];
    grouped[p.ticker].push(p);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-gray-200 tracking-tight">Padrões</h1>
        <span className="text-[10px] text-emerald-600 border border-emerald-800/50 rounded px-1.5 py-0.5">
          {patterns.length} padrões detectados
        </span>
      </div>

      <p className="text-xs text-gray-500">
        Padrões recorrentes: &quot;quando X acontece, Y reage assim&quot;. Baseado em correlação histórica notícia → preço.
      </p>

      {Object.entries(grouped).map(([ticker, pats]) => (
        <div key={ticker} className="border border-gray-800/60 rounded-lg bg-[#0d0d14] overflow-hidden">
          <div className="p-4 border-b border-gray-800/40 flex items-center gap-3">
            <span className="text-cyan-400 font-mono font-bold">{ticker}</span>
            <span className="text-[10px] text-gray-600">{pats.length} padrões</span>
          </div>
          <div className="divide-y divide-gray-800/30">
            {pats.map((p) => (
              <div key={p.id} className="px-4 py-3 hover:bg-gray-800/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${TYPE_COLORS[p.pattern_type] || TYPE_COLORS.general}`}>
                        {p.pattern_type}
                      </span>
                      <span className="text-[10px] text-gray-600">{p.occurrences} ocorrências</span>
                    </div>
                    <p className="text-sm text-gray-300">{p.description}</p>
                    {p.sample_articles?.slice(0, 2).map((sa, i) => (
                      <div key={i} className="text-[10px] text-gray-500 mt-1 flex items-center gap-2">
                        <span className="text-gray-700">→</span>
                        <span className="truncate">{sa.title}</span>
                        {sa.delta !== null && (
                          <span className={sa.delta > 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {sa.delta > 0 ? '+' : ''}{sa.delta?.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-mono font-bold ${p.avg_impact > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.avg_impact > 0 ? '+' : ''}{p.avg_impact?.toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-gray-600">σ {p.std_dev?.toFixed(2)}%</div>
                    <div className="text-[10px] text-gray-600">conf {(p.avg_confidence * 100)?.toFixed(0)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {patterns.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">◈</p>
          <p>Nenhum padrão identificado. Execute o pattern matcher após o impact scoring.</p>
        </div>
      )}
    </div>
  );
}
