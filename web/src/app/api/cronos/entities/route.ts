import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get('limit') || '20';

  try {
    const entities = await supabaseQuery(
      'cronos_entities',
      `select=*&limit=${limit}`
    );
    return NextResponse.json(entities);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
