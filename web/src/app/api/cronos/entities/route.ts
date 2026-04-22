import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get('limit') || '20';
  const search = searchParams.get('search');

  try {
    let query = `select=*&limit=${limit}`;
    if (search) {
      // Search by value (ticker) or canonical_name (company name)
      query = `select=*&or=(value.ilike.*${search}*,canonical_name.ilike.*${search}*)&limit=${limit}`;
    }
    const entities = await supabaseQuery('cronos_entities', query);
    return NextResponse.json(entities);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
