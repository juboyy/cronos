import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const source = searchParams.get('source');
  const offset = (page - 1) * limit;

  let params = `select=*,cronos_sentiment(score,label,confidence)&order=published_at.desc.nullslast&limit=${limit}&offset=${offset}`;
  if (source) params += `&source=eq.${source}`;

  try {
    const articles = await supabaseQuery('cronos_articles', params);
    return NextResponse.json({ articles, page, limit });
  } catch (e: unknown) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
