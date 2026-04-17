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

    // Get linked articles
    const links = await supabaseQuery(
      'cronos_article_entities',
      `entity_id=eq.${id}&select=article_id,relevance,context,cronos_articles(id,title,source,url,summary,published_at),cronos_articles!inner(cronos_sentiment(score,label))&order=cronos_articles(published_at).desc&limit=30`
    );

    // Get average sentiment
    const articleIds = links.map((l: any) => l.article_id);
    let avgSentiment = null;
    if (articleIds.length > 0) {
      const sentiments = await supabaseQuery(
        'cronos_sentiment',
        `article_id=in.(${articleIds.join(',')})&select=score`
      );
      if (sentiments.length > 0) {
        const sum = sentiments.reduce((a: number, s: any) => a + s.score, 0);
        avgSentiment = sum / sentiments.length;
      }
    }

    return NextResponse.json({
      entity,
      articles: links,
      stats: {
        article_count: links.length,
        avg_sentiment: avgSentiment,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
