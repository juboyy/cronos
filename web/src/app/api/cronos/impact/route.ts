import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker');
  const limit = req.nextUrl.searchParams.get('limit') || '50';
  const minScore = req.nextUrl.searchParams.get('min_score') || '0';

  let query = `select=*,cronos_articles(title,source,published_at)&order=impact_score.desc&limit=${limit}`;
  if (ticker) query += `&ticker=eq.${ticker}`;
  if (parseFloat(minScore) > 0) query += `&impact_score=gte.${minScore}`;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cronos_impacts?${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    next: { revalidate: 60 },
  });

  return NextResponse.json(await res.json());
}
