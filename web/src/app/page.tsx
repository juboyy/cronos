import { supabaseQuery } from '@/lib/supabase';
import { ArticleCard } from '@/components/ArticleCard';
import { SentimentBar } from '@/components/SentimentIndicator';

export const dynamic = 'force-dynamic';

async function getArticles() {
  return supabaseQuery(
    'cronos_articles',
    'select=*,cronos_sentiment(score,label,confidence)&order=published_at.desc.nullslast&limit=30'
  );
}

async function getTrending() {
  return supabaseQuery(
    'cronos_entities',
    'select=id,type,value,canonical_name,sector&type=eq.ticker&limit=12'
  );
}

async function getStats() {
  try {
    const [articles, sentiments] = await Promise.all([
      supabaseQuery('cronos_articles', 'select=id&limit=1').catch(() => []),
      supabaseQuery('cronos_sentiment', 'select=score&limit=200').catch(() => []),
    ]);
    const avgScore = sentiments.length > 0
      ? sentiments.reduce((a: number, s: any) => a + s.score, 0) / sentiments.length
      : 0;
    return { avgScore, sentimentCount: sentiments.length };
  } catch {
    return { avgScore: 0, sentimentCount: 0 };
  }
}

export default async function FeedPage() {
  const [articles, trending, stats] = await Promise.all([
    getArticles(),
    getTrending(),
    getStats(),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      {/* Feed */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <h1 className="text-lg font-bold text-gray-200 tracking-tight">Feed de Inteligência</h1>
          <span className="text-[10px] text-cyan-600 border border-cyan-800/50 rounded px-1.5 py-0.5">
            {articles.length} artigos
          </span>
        </div>

        {/* Sentiment overview */}
        <div className="border border-gray-800/60 rounded-lg p-3 mb-5 bg-[#0d0d14]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Sentimento Geral</span>
            <span className={`text-xs font-mono ${stats.avgScore > 0.05 ? 'text-emerald-400' : stats.avgScore < -0.05 ? 'text-red-400' : 'text-yellow-400'}`}>
              {stats.avgScore > 0 ? '+' : ''}{stats.avgScore.toFixed(3)}
            </span>
          </div>
          <SentimentBar score={stats.avgScore} />
          <p className="text-[10px] text-gray-600 mt-1.5">{stats.sentimentCount} artigos analisados</p>
        </div>

        <div className="space-y-3">
          {articles.map((article: any) => {
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

        {articles.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">◈</p>
            <p>Nenhum artigo encontrado. Execute o crawler primeiro.</p>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="space-y-5">
        <div className="border border-gray-800/60 rounded-lg p-4 bg-[#0d0d14]">
          <h2 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Entidades Rastreadas</h2>
          <div className="space-y-2">
            {trending.map((entity: any) => (
              <a
                key={entity.id}
                href={`/entity/${entity.id}`}
                className="flex items-center justify-between group/ent hover:bg-gray-800/30 rounded px-2 py-1.5 -mx-2 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-cyan-700">$</span>
                  <span className="text-sm text-gray-300 group-hover/ent:text-cyan-400 transition-colors font-medium">
                    {entity.value}
                  </span>
                </div>
                <span className="text-[10px] text-gray-600">{entity.sector}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="border border-gray-800/60 rounded-lg p-4 bg-[#0d0d14]">
          <h2 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Fontes</h2>
          <div className="space-y-1.5 text-xs">
            {['infomoney', 'valor', 'b3', 'bcb', 'reuters'].map((s) => (
              <div key={s} className="flex items-center gap-2 text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-800" />
                <span className="uppercase tracking-wider">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
