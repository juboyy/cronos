import { NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

export async function GET() {
  try {
    const clusters = await supabaseQuery('cronos_clusters',
      'select=*&order=created_at.desc&limit=20');
    return NextResponse.json(clusters);
  } catch (e: unknown) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
