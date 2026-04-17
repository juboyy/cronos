'use client';

import { useState } from 'react';
import { ArticleCard } from '@/components/ArticleCard';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=30`);
      const data = await res.json();
      setResults(data.articles || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-lg font-bold text-gray-200 mb-5 tracking-tight">Busca Profunda</h1>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por ticker, empresa, setor..."
            className="flex-1 bg-[#0d0d14] border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-cyan-700 transition-colors font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-cyan-900/40 border border-cyan-700/50 rounded-lg text-sm text-cyan-400 font-medium hover:bg-cyan-800/40 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'Buscar'}
          </button>
        </div>
      </form>

      {loading && (
        <div className="text-center py-12 text-gray-600">
          <div className="animate-pulse text-4xl mb-3">◈</div>
          <p className="text-sm">Pesquisando...</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <p className="text-sm">Nenhum resultado para &quot;{query}&quot;</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 mb-3">{results.length} resultados</p>
          <div className="space-y-3">
            {results.map((article: any) => {
              const sentiment = article.cronos_sentiment?.[0] || null;
              return (
                <ArticleCard
                  key={article.id}
                  title={article.title}
                  source={article.source}
                  url={article.url}
                  summary={article.summary}
                  published_at={article.published_at}
                  sentiment={sentiment}
                />
              );
            })}
          </div>
        </div>
      )}

      {!searched && (
        <div className="text-center py-16 text-gray-700">
          <p className="text-5xl mb-4">◈</p>
          <p className="text-sm">Full-text search em português sobre todas as notícias financeiras</p>
          <p className="text-xs mt-1 text-gray-800">Tickers · Empresas · Setores · Temas</p>
        </div>
      )}
    </div>
  );
}
