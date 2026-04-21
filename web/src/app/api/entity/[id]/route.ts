import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';
import { Article, Entity, ArticleEntity, Sentiment, Impact, Price } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const entities = await supabaseQuery('cronos_entities', `id=eq.${id}&limit=1`) as Entity[];
    if (!entities.length) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }
    const entity = entities[0];

    let links = await supabaseQuery(
      'cronos_article_entities',
      `entity_id=eq.${id}&select=article_id,relevance,context,cronos_articles(id,title,source,url,summary,published_at)&order=cronos_articles(published_at).desc&limit=30`
    ) as ArticleEntity[];

    if (links.length === 0 && entity.type === 'ticker') {
      const relatedEntities = await supabaseQuery(
        'cronos_entities',
        `type=eq.company&canonical_name=not.is.null&select=id,canonical_name`
      ) as Entity[];

      const stripped = entity.value?.replace(/\d+/g, '').toLowerCase();
      for (const rel of relatedEntities) {
        if (rel.canonical_name?.toLowerCase().includes(stripped)) {
          const relLinks = await supabaseQuery(
            'cronos_article_entities',
            `entity_id=eq.${rel.id}&select=article_id,relevance,context,cronos_articles(id,title,source,url,summary,published_at)&order=cronos_articles(published_at).desc&limit=30`
          ) as ArticleEntity[];
          if (relLinks.length > 0) {
            links = relLinks;
            break;
          }
        }
      }
    }

    if (links.length === 0 && entity.type === 'ticker') {
      const fallbackArticles = await supabaseQuery(
        'cronos_articles',
        `title=ilike.*${entity.value}*&select=id,title,source,url,summary,published_at&order=published_at.desc&limit=30`
      ) as Article[];
      links = fallbackArticles.map((a) => ({
        article_id: a.id,
        relevance: 0.5,
        context: 'title mention',
        cronos_articles: a,
        entity_id: id,
      }));
    }

    const articleIds = links
      .map((l) => l.article_id || l.cronos_articles?.id)
      .filter(Boolean) as string[];
    let sentiments: Sentiment[] = [];
    let avgSentiment: number | null = null;

    if (articleIds.length > 0) {
      sentiments = await supabaseQuery(
        'cronos_sentiment',
        `article_id=in.(${articleIds.join(',')})&select=article_id,score,label`
      ) as Sentiment[];
      if (sentiments.length > 0) {
        const sum = sentiments.reduce((a: number, s) => a + (s.score || 0), 0);
        avgSentiment = sum / sentiments.length;
      }
    }

    let impacts: Impact[] = [];
    if (entity.type === 'ticker') {
      impacts = await supabaseQuery(
        'cronos_impacts',
        `ticker=eq.${entity.value}&select=*,cronos_articles(title,source,published_at)&order=impact_score.desc&limit=20`
      ) as Impact[];
    }

    let prices: Price[] = [];
    if (entity.type === 'ticker') {
      prices = await supabaseQuery(
        'cronos_prices',
        `ticker=eq.${entity.value}&select=date,close,volume&order=date.desc&limit=365`
      ) as Price[];
    }

    const sentMap: Record<string, Sentiment> = {};
    for (const s of sentiments) sentMap[s.article_id] = s;

    const articles = links.map((l) => ({
      ...l,
      cronos_articles: l.cronos_articles ? {
        ...l.cronos_articles,
        sentiment: sentMap[l.article_id || l.cronos_articles.id] || null,
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
  } catch (e: unknown) {
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
