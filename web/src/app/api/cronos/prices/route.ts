import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker');
  const days = req.nextUrl.searchParams.get('days') || '90';
  const indicator = req.nextUrl.searchParams.get('indicator');

  // Prices
  if (ticker) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/cronos_prices?ticker=eq.${ticker}&order=date.desc&limit=${days}&select=date,open,high,low,close,volume`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, next: { revalidate: 3600 } }
    );
    return NextResponse.json(await res.json());
  }

  // Macro
  if (indicator) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/cronos_macro?indicator=eq.${indicator}&order=date.desc&limit=${days}&select=date,value`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, next: { revalidate: 3600 } }
    );
    return NextResponse.json(await res.json());
  }

  return NextResponse.json({ error: 'ticker or indicator required' }, { status: 400 });
}
