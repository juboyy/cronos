import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '10'), 30);

  try {
    // Get entities with most article links using PostgREST joins instead of exec_sql
    const entitiesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/cronos_article_entities?select=entity_id,cronos_entities!inner(id,type,value,canonical_name,sector)&limit=500`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, next: { revalidate: 900 } }
    );

    if (!entitiesRes.ok) {
      // Simple fallback: just list ticker entities
      const fallbackRes = await fetch(
        `${SUPABASE_URL}/rest/v1/cronos_entities?select=id,type,value,canonical_name,sector&type=eq.ticker&limit=${limit}`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      return NextResponse.json({ trending: await fallbackRes.json(), source: 'fallback' });
    }

    const links = await entitiesRes.json();

    // Aggregate mention counts client-side
    const counts: Record<string, { entity: any; count: number }> = {};
    for (const link of links) {
      const e = link.cronos_entities;
      if (!e) continue;
      if (!counts[e.id]) counts[e.id] = { entity: e, count: 0 };
      counts[e.id].count++;
    }

    const trending = Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(c => ({ ...c.entity, mention_count: c.count }));

    return NextResponse.json({ trending });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
