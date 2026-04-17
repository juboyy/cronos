import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// Enhanced search: lexical (FTS) + entity graph navigation
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  const mode = req.nextUrl.searchParams.get('mode') || 'hybrid'; // fts, entity, hybrid
  const ticker = req.nextUrl.searchParams.get('ticker');
  const limit = req.nextUrl.searchParams.get('limit') || '20';

  if (!q && !ticker) {
    return NextResponse.json({ error: 'q or ticker required' }, { status: 400 });
  }

  const results: any = { query: q, mode, articles: [], entities: [], related: [] };

  // 1. Full-text search on articles
  if (mode === 'fts' || mode === 'hybrid') {
    const ftsQuery = q.split(' ').filter(Boolean).join(' & ');
    const articlesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/cronos_articles?select=id,title,source,summary,published_at,cronos_sentiment(score,label)` +
      `&or=(title.fts.${encodeURIComponent(ftsQuery)},summary.fts.${encodeURIComponent(ftsQuery)})` +
      `&order=published_at.desc&limit=${limit}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (articlesRes.ok) {
      results.articles = await articlesRes.json();
    }
  }

  // 2. Entity search (ticker/company lookup)
  if (mode === 'entity' || mode === 'hybrid') {
    const entityQuery = ticker || q;
    const entRes = await fetch(
      `${SUPABASE_URL}/rest/v1/cronos_entities?select=id,type,value,canonical_name,sector` +
      `&or=(value.ilike.*${encodeURIComponent(entityQuery)}*,canonical_name.ilike.*${encodeURIComponent(entityQuery)}*)` +
      `&limit=10`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (entRes.ok) {
      results.entities = await entRes.json();
    }

    // 3. Entity graph: find related articles via entity links
    if (results.entities.length > 0) {
      const entityId = results.entities[0].id;
      const relatedRes = await fetch(
        `${SUPABASE_URL}/rest/v1/cronos_article_entities?select=cronos_articles(id,title,source,published_at,cronos_sentiment(score,label))` +
        `&entity_id=eq.${entityId}&order=cronos_articles.published_at.desc&limit=10`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      );
      if (relatedRes.ok) {
        const linked = await relatedRes.json();
        results.related = linked
          .map((l: any) => l.cronos_articles)
          .filter(Boolean);
      }

      // 4. Get impacts for entity
      const impRes = await fetch(
        `${SUPABASE_URL}/rest/v1/cronos_impacts?select=ticker,impact_score,delta_1d,volume_anomaly` +
        `&entity_id=eq.${entityId}&order=impact_score.desc&limit=5`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      );
      if (impRes.ok) {
        results.impacts = await impRes.json();
      }

      // 5. Get patterns for entity
      if (results.entities[0].type === 'ticker') {
        const patRes = await fetch(
          `${SUPABASE_URL}/rest/v1/cronos_patterns?ticker=eq.${results.entities[0].value}&order=occurrences.desc&limit=5`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
        );
        if (patRes.ok) {
          results.patterns = await patRes.json();
        }
      }
    }
  }

  // Merge and deduplicate articles
  if (mode === 'hybrid' && results.related.length > 0) {
    const existingIds = new Set(results.articles.map((a: any) => a.id));
    for (const r of results.related) {
      if (!existingIds.has(r.id)) {
        results.articles.push(r);
      }
    }
  }

  results.total = results.articles.length;
  return NextResponse.json(results);
}
