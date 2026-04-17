import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

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
    return NextResponse.json(sentiment);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
