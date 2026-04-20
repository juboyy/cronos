import { NextRequest } from 'next/server';
import { supabaseQuery, cronosResponse } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get('limit') || '20';
  const article_id = searchParams.get('article_id');

  try {
    let query = `select=*,cronos_articles(title,source,published_at)&order=created_at.desc&limit=${limit}`;
    if (article_id) {
      query = `article_id=eq.${article_id}&` + query;
    }
    const sentiment = await supabaseQuery('cronos_sentiment', query);
    return cronosResponse(sentiment);
  } catch (e: unknown) {
    return cronosResponse(e);
  }
}
