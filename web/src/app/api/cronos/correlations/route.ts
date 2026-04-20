import { NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

export async function GET() {
  try {
    const correlations = await supabaseQuery('cronos_correlations',
      'select=*&order=signal_strength.desc&limit=20');
    return NextResponse.json(correlations);
  } catch (e: unknown) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
