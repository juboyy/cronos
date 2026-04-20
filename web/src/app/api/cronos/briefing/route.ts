import { NextRequest } from 'next/server';
import { supabaseQuery, cronosResponse } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    const params = date
      ? `select=*&date=eq.${date}`
      : 'select=*&order=date.desc&limit=7';

    const briefings = await supabaseQuery('cronos_briefings', params);
    return cronosResponse(briefings);
  } catch (e: unknown) {
    return cronosResponse(e);
  }
}
