import { supabaseQuery } from '@/lib/supabase';
import { SentimentBar } from '@/components/SentimentIndicator';
import { ArticleCard } from '@/components/ArticleCard';
import { EntityBadge } from '@/components/EntityBadge';

export const dynamic = 'force-dynamic';

async function getEntity(id: string) {
  const entities = await supabaseQuery('cronos_entities', `id=eq.${id}&limit=1`);
  return entities[0] || null;
}

async function getLinkedArticles(entityId: string) {
  return supabaseQuery(
    'cronos_article_entities',
    `entity_id=eq.${entityId}&select=relevance,context,cronos_articles(id,title,source,url,summary,published_at,cronos_sentiment(score,label))&limit=30`
  );
}

export default async function EntityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entity = await getEntity(id);

  if (!entity) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-3">◈</p>
        <p className="text-gray-500">Entidade não encontrada</p>
        <a href="/" className="text-cyan-600 text-sm hover:text-cyan-400 mt-2 block">← Voltar ao Feed</a>
      </div>
    );
  }

  const links = await getLinkedArticles(id);
  const articles = links.map((l: any) => ({
    ...l.cronos_articles,
    relevance: l.relevance,
    context: l.context,
  })).filter((a: any) => a?.title);

  // Calculate aggregated sentiment
  const sentiments = articles
    .map((a: any) => a.cronos_sentiment?.[0]?.score)
    .filter((s: any) => s !== undefined && s !== null);
  const avgSentiment = sentiments.length > 0
    ? sentiments.reduce((a: number, b: number) => a + b, 0) / sentiments.length
    : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <a href="/" className="text-xs text-gray-600 hover:text-cyan-600 transition-colors mb-4 block">← Feed</a>

      {/* Entity header */}
      <div className="border border-gray-800/60 rounded-lg p-5 bg-[#0d0d14] mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <EntityBadge type={entity.type} value={entity.value} />
              {entity.canonical_name && (
                <h1 className="text-lg font-bold text-gray-200">{entity.canonical_name}</h1>
              )}
            </div>
            {entity.sector && (
              <p className="text-xs text-gray-500">Setor: {entity.sector}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Sentimento</p>
            <p className={`text-xl font-mono font-bold ${avgSentiment > 0.05 ? 'text-emerald-400' : avgSentiment < -0.05 ? 'text-red-400' : 'text-yellow-400'}`}>
              {avgSentiment > 0 ? '+' : ''}{avgSentiment.toFixed(3)}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <SentimentBar score={avgSentiment} />
        </div>
        <p className="text-[10px] text-gray-600 mt-2">{articles.length} menções · {sentiments.length} com sentimento</p>
      </div>

      {/* Articles */}
      <h2 className="text-sm text-gray-400 mb-3">Notícias relacionadas</h2>
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
        <div className="text-center py-12 text-gray-600">
          <p>Nenhuma notícia vinculada a esta entidade ainda.</p>
        </div>
      )}
    </div>
  );
}
