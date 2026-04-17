import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker');
  const type = req.nextUrl.searchParams.get('type');
  const limit = req.nextUrl.searchParams.get('limit') || '20';

  let query = `select=*&order=occurrences.desc&limit=${limit}`;
  if (ticker) query += `&ticker=eq.${ticker}`;
  if (type) query += `&pattern_type=eq.${type}`;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cronos_patterns?${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    next: { revalidate: 300 },
  });

  return NextResponse.json(await res.json());
}
