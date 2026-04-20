import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get('limit') || '20';

  try {
    const macro = await supabaseQuery(
      'cronos_macro',
      `select=*&order=date.desc&limit=${limit}`
    );
    return NextResponse.json(macro);
  } catch (e: unknown) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
