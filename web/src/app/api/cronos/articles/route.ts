import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 500);
  const search = searchParams.get('search');
  const entityId = searchParams.get('entity_id');

  try {
    let filter = '';
    if (search) {
      filter += `&title=ilike.*${search}*`;
    }

    // If entity_id is provided, get articles linked to that entity
    if (entityId) {
      const links = await supabaseQuery(
        'cronos_article_entities',
        `select=article_id&entity_id=eq.${entityId}&limit=${limit}`
      );
      const articleIds = (links as { article_id: string }[]).map((l) => l.article_id);
      if (articleIds.length === 0) {
        return NextResponse.json({ articles: [], total: 0, offset, limit });
      }
      filter += `&id=in.(${articleIds.join(',')})`;
    }

    const articles = await supabaseQuery(
      'cronos_articles',
      `select=id,title,source,summary,published_at,url,cronos_sentiment(score,label)&order=published_at.desc.nullslast&limit=${limit}&offset=${offset}${filter}`
    );

    // Get total count
    const countRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL}/rest/v1/cronos_articles?select=id&head=true`,
      {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
          'Prefer': 'count=exact',
        },
      }
    );
    const total = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10);

    return NextResponse.json({ articles, total, offset, limit });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
