import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Get entity
    const entities = await supabaseQuery('cronos_entities', `id=eq.${id}&limit=1`);
    if (!entities.length) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }
    const entity = entities[0];

    // Get linked articles — multi-strategy
    let links = await supabaseQuery(
      'cronos_article_entities',
      `entity_id=eq.${id}&select=article_id,relevance,context,cronos_articles(id,title,source,url,summary,published_at)&order=cronos_articles(published_at).desc&limit=30`
    );

    // Strategy 2: If ticker, find company entity with same canonical_name
    if (links.length === 0 && entity.type === 'ticker') {
      const relatedEntities = await supabaseQuery(
        'cronos_entities',
        `type=eq.company&canonical_name=not.is.null&select=id,canonical_name`
      );

      const stripped = entity.value?.replace(/\d+/g, '').toLowerCase();
      for (const rel of relatedEntities) {
        if (rel.canonical_name?.toLowerCase().includes(stripped)) {
          const relLinks = await supabaseQuery(
            'cronos_article_entities',
            `entity_id=eq.${rel.id}&select=article_id,relevance,context,cronos_articles(id,title,source,url,summary,published_at)&order=cronos_articles(published_at).desc&limit=30`
          );
          if (relLinks.length > 0) {
            links = relLinks;
            break;
          }
        }
      }
    }

    // Strategy 3: fallback to title mention
    if (links.length === 0 && entity.type === 'ticker') {
      const fallbackArticles = await supabaseQuery(
        'cronos_articles',
        `title=ilike.*${entity.value}*&select=id,title,source,url,summary,published_at&order=published_at.desc&limit=30`
      );
      links = fallbackArticles.map((a: any) => ({
        article_id: a.id,
        relevance: 0.5,
        context: 'title mention',
        cronos_articles: a,
      }));
    }

    // Get sentiments for linked articles
    const articleIds = links
      .map((l: any) => l.article_id || l.cronos_articles?.id)
      .filter(Boolean);
    let sentiments: any[] = [];
    let avgSentiment = null;

    if (articleIds.length > 0) {
      sentiments = await supabaseQuery(
        'cronos_sentiment',
        `article_id=in.(${articleIds.join(',')})&select=article_id,score,label`
      );
      if (sentiments.length > 0) {
        const sum = sentiments.reduce((a: number, s: any) => a + (s.score || 0), 0);
        avgSentiment = sum / sentiments.length;
      }
    }

    // Get impacts if ticker
    let impacts: any[] = [];
    if (entity.type === 'ticker') {
      impacts = await supabaseQuery(
        'cronos_impacts',
        `ticker=eq.${entity.value}&select=*,cronos_articles(title,source,published_at)&order=impact_score.desc&limit=20`
      );
    }

    // Get prices if ticker
    let prices: any[] = [];
    if (entity.type === 'ticker') {
      prices = await supabaseQuery(
        'cronos_prices',
        `ticker=eq.${entity.value}&select=date,close,volume&order=date.desc&limit=365`
      );
    }

    // Enrich articles with sentiment
    const sentMap: Record<string, any> = {};
    for (const s of sentiments) sentMap[s.article_id] = s;

    const articles = links.map((l: any) => ({
      ...l,
      cronos_articles: l.cronos_articles ? {
        ...l.cronos_articles,
        sentiment: sentMap[l.article_id || l.cronos_articles?.id] || null,
      } : null,
    }));

    return NextResponse.json({
      entity,
      articles,
      impacts,
      prices,
      stats: {
        article_count: articles.length,
        avg_sentiment: avgSentiment,
        sentiment_count: sentiments.length,
        impact_count: impacts.length,
        price_days: prices.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
