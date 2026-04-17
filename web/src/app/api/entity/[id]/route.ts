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

    // Get linked articles (try direct link first)
    let links = await supabaseQuery(
      'cronos_article_entities',
      `entity_id=eq.${id}&select=article_id,relevance,context,cronos_articles(id,title,source,url,summary,published_at)&order=cronos_articles(published_at).desc&limit=30`
    );

    // If no results and it's a ticker, search by title mention
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
    const articleIds = links.map((l: any) => l.article_id).filter(Boolean);
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

    // Enrich articles with sentiment
    const sentMap: Record<string, any> = {};
    for (const s of sentiments) sentMap[s.article_id] = s;

    const articles = links.map((l: any) => ({
      ...l,
      cronos_articles: l.cronos_articles ? {
        ...l.cronos_articles,
        sentiment: sentMap[l.article_id] || null,
      } : null,
    }));

    return NextResponse.json({
      entity,
      articles,
      stats: {
        article_count: articles.length,
        avg_sentiment: avgSentiment,
        sentiment_count: sentiments.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
