import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  if (!q.trim()) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    // Full-text search in Portuguese
    const tsQuery = q.trim().split(/\s+/).join(' & ');
    const params = `select=*,cronos_sentiment(score,label,confidence)&fts=fts.${encodeURIComponent(tsQuery)}&order=published_at.desc.nullslast&limit=${limit}`;
    const articles = await supabaseQuery('cronos_articles', params);
    return NextResponse.json({ articles, query: q });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
