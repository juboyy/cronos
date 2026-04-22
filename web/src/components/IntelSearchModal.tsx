'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Entity {
  id: string;
  type: string;
  value: string;
  canonical_name: string;
  sector: string;
}

interface SearchArticle {
  id: string;
  title: string;
  source: string;
  published_at: string;
  url: string;
  sentiment?: { score: number; label: string };
}

interface EntityDetail {
  entity: Entity;
  mentions: number;
  avg_sentiment: number;
  articles: SearchArticle[];
  related: { name: string; sector: string; weight: number }[];
  impacts: { ticker: string; delta_1d: number; impact_score: number; article_title: string }[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function sentimentColor(score: number): string {
  if (score > 0.2) return 'text-emerald-400';
  if (score < -0.2) return 'text-red-400';
  return 'text-amber-400';
}

function sentimentBg(score: number): string {
  if (score > 0.2) return 'bg-emerald-500/10 border-emerald-500/30';
  if (score < -0.2) return 'bg-red-500/10 border-red-500/30';
  return 'bg-amber-500/10 border-amber-500/30';
}

export default function IntelSearchModal({
  isOpen,
  onClose,
  initialQuery = '',
}: {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [articles, setArticles] = useState<SearchArticle[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'articles' | 'entities'>('entities');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      if (initialQuery) {
        setQuery(initialQuery);
        doSearch(initialQuery);
      }
    }
  }, [isOpen, initialQuery]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setEntities([]);
      setArticles([]);
      setSelectedEntity(null);
      return;
    }
    setLoading(true);
    try {
      const [entRes, artRes] = await Promise.all([
        fetch(`/api/cronos/entities?search=${encodeURIComponent(q)}&limit=10`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/cronos/articles?search=${encodeURIComponent(q)}&limit=20`).then(r => r.ok ? r.json() : { articles: [] }).catch(() => ({ articles: [] })),
      ]);
      setEntities(Array.isArray(entRes) ? entRes : []);
      const arts = artRes?.articles || (Array.isArray(artRes) ? artRes : []);
      setArticles(arts);
      setActiveTab(entRes?.length > 0 ? 'entities' : 'articles');
    } catch {
      setEntities([]);
      setArticles([]);
    }
    setLoading(false);
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    setSelectedEntity(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  async function drillEntity(entity: Entity) {
    setLoadingDetail(true);
    try {
      const [artRes, impactRes, graphRes] = await Promise.all([
        fetch(`/api/cronos/articles?entity_id=${entity.id}&limit=15`).then(r => r.ok ? r.json() : { articles: [] }).catch(() => ({ articles: [] })),
        fetch(`/api/cronos/impact?ticker=${entity.value}&limit=10`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/engines/bettafish/graph?action=entity&entity=${encodeURIComponent(entity.canonical_name || entity.value)}`).then(r => r.ok ? r.json() : { related: [] }).catch(() => ({ related: [] })),
      ]);

      const arts = artRes?.articles || (Array.isArray(artRes) ? artRes : []);
      const sentimentScores = arts.filter((a: SearchArticle) => a.sentiment?.score !== undefined).map((a: SearchArticle) => a.sentiment!.score);
      const avgSent = sentimentScores.length > 0 ? sentimentScores.reduce((a: number, b: number) => a + b, 0) / sentimentScores.length : 0;

      setSelectedEntity({
        entity,
        mentions: arts.length,
        avg_sentiment: avgSent,
        articles: arts,
        related: graphRes?.related || [],
        impacts: Array.isArray(impactRes) ? impactRes.map((i: Record<string, unknown>) => ({
          ticker: (i.ticker as string) || '',
          delta_1d: (i.delta_1d as number) || 0,
          impact_score: (i.impact_score as number) || 0,
          article_title: ((i.cronos_articles as Record<string, string>)?.title) || '',
        })) : [],
      });
    } catch {
      setSelectedEntity(null);
    }
    setLoadingDetail(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-[8vh]" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[82vh] bg-[#0a0f1a] border border-emerald-500/20 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-emerald-500/10">
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 text-xl">⌘</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              placeholder="Buscar ticker, empresa, setor ou tema..."
              className="flex-1 bg-transparent text-white text-lg font-mono outline-none placeholder:text-gray-600"
              autoFocus
            />
            <kbd className="text-xs text-gray-500 border border-gray-700 px-2 py-0.5 rounded font-mono">ESC</kbd>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8 font-mono text-sm animate-pulse">
              Buscando...
            </div>
          ) : selectedEntity ? (
            /* Entity Detail View - Drill Down */
            <div className="space-y-4">
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-emerald-400 text-sm font-mono hover:underline"
              >
                ← Voltar aos resultados
              </button>

              {/* Entity Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono uppercase">
                      {selectedEntity.entity.type}
                    </span>
                    <h2 className="text-2xl font-bold text-white font-mono">
                      {selectedEntity.entity.canonical_name || selectedEntity.entity.value}
                    </h2>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Setor: {selectedEntity.entity.sector || 'N/A'} · {selectedEntity.mentions} menções
                  </p>
                </div>
                <div className={`text-right px-3 py-2 rounded border ${sentimentBg(selectedEntity.avg_sentiment)}`}>
                  <div className={`text-2xl font-mono font-bold ${sentimentColor(selectedEntity.avg_sentiment)}`}>
                    {selectedEntity.avg_sentiment > 0 ? '+' : ''}{selectedEntity.avg_sentiment.toFixed(3)}
                  </div>
                  <div className="text-xs text-gray-400">sentimento médio</div>
                </div>
              </div>

              {/* Impact Scores */}
              {selectedEntity.impacts.length > 0 && (
                <div>
                  <h3 className="text-sm font-mono text-gray-400 mb-2 uppercase tracking-wider">Análise de Impacto</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedEntity.impacts.slice(0, 4).map((imp, i) => (
                      <div key={i} className="bg-[#111827] border border-gray-800 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-emerald-400 text-sm">{imp.ticker}</span>
                          <span className={`font-mono text-sm ${imp.delta_1d > 0 ? 'text-emerald-400' : imp.delta_1d < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {imp.delta_1d > 0 ? '+' : ''}{imp.delta_1d?.toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">{imp.article_title}</div>
                        <div className="mt-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500/50 rounded-full"
                            style={{ width: `${Math.min(imp.impact_score * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Entities */}
              {selectedEntity.related.length > 0 && (
                <div>
                  <h3 className="text-sm font-mono text-gray-400 mb-2 uppercase tracking-wider">Entidades Relacionadas</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntity.related.map((rel, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setQuery(rel.name);
                          doSearch(rel.name);
                          setSelectedEntity(null);
                        }}
                        className="px-3 py-1.5 bg-[#111827] border border-gray-700 rounded-lg text-sm font-mono text-gray-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                      >
                        {rel.name}
                        {rel.sector && <span className="text-gray-600 ml-1">· {rel.sector}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Articles Timeline */}
              <div>
                <h3 className="text-sm font-mono text-gray-400 mb-2 uppercase tracking-wider">
                  Artigos ({selectedEntity.articles.length})
                </h3>
                <div className="space-y-1">
                  {selectedEntity.articles.map((art, i) => (
                    <a
                      key={i}
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2 rounded-lg hover:bg-[#111827] transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-200 group-hover:text-white truncate">
                            {art.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 font-mono">{art.source}</span>
                            <span className="text-xs text-gray-600">·</span>
                            <span className="text-xs text-gray-500">{timeAgo(art.published_at)}</span>
                            {art.sentiment && (
                              <>
                                <span className="text-xs text-gray-600">·</span>
                                <span className={`text-xs font-mono ${sentimentColor(art.sentiment.score)}`}>
                                  {art.sentiment.score > 0 ? '+' : ''}{art.sentiment.score.toFixed(2)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="text-gray-700 group-hover:text-gray-500 text-xs">↗</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : (entities.length > 0 || articles.length > 0) ? (
            /* Search Results */
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex gap-4 border-b border-gray-800">
                <button
                  onClick={() => setActiveTab('entities')}
                  className={`pb-2 px-1 text-sm font-mono ${activeTab === 'entities' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500'}`}
                >
                  Entidades ({entities.length})
                </button>
                <button
                  onClick={() => setActiveTab('articles')}
                  className={`pb-2 px-1 text-sm font-mono ${activeTab === 'articles' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500'}`}
                >
                  Artigos ({articles.length})
                </button>
              </div>

              {activeTab === 'entities' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {entities.map((ent) => (
                    <button
                      key={ent.id}
                      onClick={() => drillEntity(ent)}
                      className="text-left p-3 bg-[#111827] border border-gray-800 rounded-lg hover:border-emerald-500/30 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono uppercase mr-2">
                            {ent.type}
                          </span>
                          <span className="text-white font-mono font-medium">
                            {ent.canonical_name || ent.value}
                          </span>
                        </div>
                        <span className="text-gray-600 group-hover:text-emerald-400 transition-colors">→</span>
                      </div>
                      {ent.sector && (
                        <div className="text-xs text-gray-500 mt-1">{ent.sector}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'articles' && (
                <div className="space-y-1">
                  {articles.map((art, i) => (
                    <a
                      key={i}
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2 rounded-lg hover:bg-[#111827] transition-colors group"
                    >
                      <div className="text-sm text-gray-200 group-hover:text-white">{art.title}</div>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 font-mono">{art.source}</span>
                        <span className="text-xs text-gray-500">{timeAgo(art.published_at)}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : query.length >= 2 ? (
            <div className="text-center text-gray-500 py-8 font-mono text-sm">
              Nenhum resultado para &quot;{query}&quot;
            </div>
          ) : (
            /* Empty state - Quick Access */
            <div className="space-y-4">
              <div className="text-xs text-gray-500 font-mono uppercase tracking-wider">Acesso Rápido</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['PETR4', 'VALE3', 'BBAS3', 'B3SA3', 'ITUB4', 'PRIO3'].map(ticker => (
                  <button
                    key={ticker}
                    onClick={() => { setQuery(ticker); doSearch(ticker); }}
                    className="p-3 bg-[#111827] border border-gray-800 rounded-lg text-center font-mono text-emerald-400 hover:border-emerald-500/30 transition-colors"
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingDetail && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-emerald-400 font-mono animate-pulse">Carregando detalhes...</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-emerald-500/10 flex justify-between items-center">
          <div className="text-xs text-gray-600 font-mono">
            {entities.length} entidades · {articles.length} artigos
          </div>
          <div className="flex gap-3 text-xs text-gray-600 font-mono">
            <span>↑↓ navegar</span>
            <span>↵ abrir</span>
            <span>esc fechar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
