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
    // Search by title or summary using ilike (Supabase REST or filter)
    const searchTerm = q.trim();
    const params = `select=*,cronos_sentiment(score,label,confidence)&or=(title.ilike.*${encodeURIComponent(searchTerm)}*,summary.ilike.*${encodeURIComponent(searchTerm)}*)&order=published_at.desc.nullslast&limit=${limit}`;
    const articles = await supabaseQuery('cronos_articles', params);
    return NextResponse.json({ articles, query: q });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
