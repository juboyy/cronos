import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery, SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Parallel fetch: article, entities, sentiment, impacts
    const [articles, articleEntities, sentiments, impacts] = await Promise.all([
      supabaseQuery('cronos_articles', `id=eq.${id}&limit=1`),
      supabaseQuery(
        'cronos_article_entities',
        `article_id=eq.${id}&select=relevance,context,cronos_entities(id,type,value,canonical_name,sector)`
      ),
      supabaseQuery('cronos_sentiment', `article_id=eq.${id}&select=*`),
      supabaseQuery('cronos_impacts', `article_id=eq.${id}&select=*&order=impact_score.desc`),
    ]);

    if (!articles.length) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = articles[0];
    const entities = articleEntities.map((ae: any) => ({
      ...ae.cronos_entities,
      relevance: ae.relevance,
      context: ae.context,
    })).filter((e: any) => e.id);

    // Get tickers from entities
    const tickers = entities
      .filter((e: any) => e.type === 'ticker')
      .map((e: any) => e.value);

    // If we have tickers, get recent prices and related articles
    let prices: any[] = [];
    let relatedArticles: any[] = [];

    if (tickers.length > 0) {
      const tickerList = tickers.join(',');
      [prices] = await Promise.all([
        supabaseQuery(
          'cronos_prices',
          `ticker=in.(${tickerList})&select=ticker,date,close,volume&order=date.desc&limit=90`
        ),
      ]);

      // Find related articles through shared entities
      const entityIds = entities.map((e: any) => e.id).join(',');
      if (entityIds) {
        const relatedLinks = await supabaseQuery(
          'cronos_article_entities',
          `entity_id=in.(${entityIds})&article_id=neq.${id}&select=article_id,cronos_articles(id,title,source,published_at,url)&limit=10`
        );
        const seen = new Set<string>();
        relatedArticles = relatedLinks
          .filter((l: any) => l.cronos_articles && !seen.has(l.cronos_articles.id) && seen.add(l.cronos_articles.id))
          .map((l: any) => l.cronos_articles)
          .slice(0, 6);
      }
    }

    // Build entity graph (nodes + edges for visualization)
    const graphNodes = [
      { id: `article-${id}`, type: 'article', label: article.title?.slice(0, 50), group: 'article' },
      ...entities.map((e: any) => ({
        id: `entity-${e.id}`,
        type: e.type,
        label: e.canonical_name || e.value,
        group: e.type,
        sector: e.sector,
      })),
    ];

    const graphEdges = entities.map((e: any) => ({
      source: `article-${id}`,
      target: `entity-${e.id}`,
      weight: e.relevance || 0.5,
      label: e.context || e.type,
    }));

    // Add ticker→sector edges
    for (const e of entities) {
      if (e.sector) {
        const sectorId = `sector-${e.sector}`;
        if (!graphNodes.find((n: any) => n.id === sectorId)) {
          graphNodes.push({ id: sectorId, type: 'sector', label: e.sector, group: 'sector' });
        }
        graphEdges.push({
          source: `entity-${e.id}`,
          target: sectorId,
          weight: 0.3,
          label: 'setor',
        });
      }
    }

    // Impact chain: if we have impacts, build the transmission chain
    const transmissionChain = impacts.map((imp: any) => ({
      ticker: imp.ticker,
      sentiment: sentiments[0]?.score ?? null,
      delta_1d: imp.delta_1d,
      impact_score: imp.impact_score,
      volume_anomaly: imp.volume_anomaly,
    }));

    return NextResponse.json({
      article,
      entities,
      sentiments,
      impacts,
      prices,
      relatedArticles,
      graph: { nodes: graphNodes, edges: graphEdges },
      transmissionChain,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
