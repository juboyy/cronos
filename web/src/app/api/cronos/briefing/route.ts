import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    const params = date
      ? `select=*&date=eq.${date}`
      : 'select=*&order=date.desc&limit=7';

    const briefings = await supabaseQuery('cronos_briefings', params);
    return NextResponse.json(briefings);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
