import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 30);
  const hours = parseInt(searchParams.get('hours') || '24');

  try {
    // Use RPC or raw query via exec_sql
    const since = new Date(Date.now() - hours * 3600000).toISOString();

    // Get entities with most article links in the time window
    const query = `
      SELECT e.id, e.type, e.value, e.canonical_name, e.sector,
             COUNT(ae.article_id) as mention_count,
             AVG(s.score) as avg_sentiment
      FROM cronos_entities e
      JOIN cronos_article_entities ae ON ae.entity_id = e.id
      JOIN cronos_articles a ON a.id = ae.article_id
      LEFT JOIN cronos_sentiment s ON s.article_id = a.id
      WHERE a.crawled_at >= '${since}'
      GROUP BY e.id
      ORDER BY mention_count DESC
      LIMIT ${limit}
    `.trim();

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      // Fallback: just return most recent entities
      const fallback = await fetch(
        `${SUPABASE_URL}/rest/v1/cronos_entities?select=id,type,value,canonical_name,sector&type=eq.ticker&limit=${limit}`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      const entities = await fallback.json();
      return NextResponse.json({ trending: entities, source: 'fallback' });
    }

    const data = await res.json();
    return NextResponse.json({ trending: data, hours });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
