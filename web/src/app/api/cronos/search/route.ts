import { NextResponse } from 'next/server';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function sb(table: string, params: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return res.json();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ entities: [], articles: [], relationships: [] });

  const upper = q.toUpperCase();

  // 1. Find matching entities (ticker, company, cnpj)
  const entities = await sb('cronos_entities',
    `select=id,type,value,canonical_name,sector&or=(value.ilike.*${encodeURIComponent(q)}*,canonical_name.ilike.*${encodeURIComponent(q)}*)&limit=20`
  );

  // 2. Also try exact ticker match
  const tickerMatch = await sb('cronos_entities',
    `select=id,type,value,canonical_name,sector&value=eq.${encodeURIComponent(upper)}&type=eq.ticker&limit=1`
  );

  // Merge and deduplicate
  const allEntities = [...(tickerMatch || []), ...(entities || [])];
  const seen = new Set<string>();
  const uniqueEntities = allEntities.filter((e: { id: string }) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  // 3. Get all entity IDs sharing the same canonical_name (PETR4 → Petrobras → CNPJ)
  const canonicals = [...new Set(uniqueEntities.map((e: { canonical_name: string }) => e.canonical_name).filter(Boolean))];
  let relatedEntities: { id: string; type: string; value: string; canonical_name: string; sector: string }[] = [];
  if (canonicals.length > 0) {
    const orClauses = canonicals.map((c: string) => `canonical_name.eq.${encodeURIComponent(c)}`).join(',');
    relatedEntities = await sb('cronos_entities', `select=id,type,value,canonical_name,sector&or=(${orClauses})&limit=50`);
  }

  // Merge all entity IDs
  const allEntityIds = [...new Set([
    ...uniqueEntities.map((e: { id: string }) => e.id),
    ...relatedEntities.map((e: { id: string }) => e.id),
  ])];

  // 4. Find articles linked to these entities
  let articles: { article_id: string; entity_id: string; relevance: number; cronos_articles: { id: string; title: string; source: string; published_at: string; summary: string } }[] = [];
  if (allEntityIds.length > 0) {
    const entityFilter = allEntityIds.map((id: string) => `entity_id.eq.${id}`).join(',');
    articles = await sb('cronos_article_entities',
      `select=article_id,entity_id,relevance,cronos_articles(id,title,source,published_at,summary)&or=(${entityFilter})&order=relevance.desc&limit=50`
    );
  }

  // 5. Also search articles by title/summary
  const textArticles = await sb('cronos_articles',
    `select=id,title,source,published_at,summary&or=(title.ilike.*${encodeURIComponent(q)}*,summary.ilike.*${encodeURIComponent(q)}*)&order=published_at.desc&limit=20`
  );

  // 6. Find cross-entity relationships (entities that appear in the same articles)
  const articleIds = [...new Set(articles.map((a: { article_id: string }) => a.article_id))];
  let coEntities: { article_id: string; entity_id: string; cronos_entities: { id: string; type: string; value: string; canonical_name: string } }[] = [];
  if (articleIds.length > 0 && articleIds.length <= 50) {
    const artFilter = articleIds.slice(0, 30).map((id: string) => `article_id.eq.${id}`).join(',');
    coEntities = await sb('cronos_article_entities',
      `select=article_id,entity_id,cronos_entities(id,type,value,canonical_name)&or=(${artFilter})&limit=200`
    );
  }

  // Build relationship graph
  const relationships: { source: string; target: string; weight: number; articles: string[] }[] = [];
  const articleEntityMap: Record<string, Set<string>> = {};
  for (const ce of coEntities) {
    if (!articleEntityMap[ce.article_id]) articleEntityMap[ce.article_id] = new Set();
    articleEntityMap[ce.article_id].add(ce.cronos_entities?.canonical_name || ce.entity_id);
  }

  // Co-occurrence matrix
  const pairs: Record<string, { weight: number; articles: Set<string> }> = {};
  for (const [artId, entSet] of Object.entries(articleEntityMap)) {
    const ents = [...entSet];
    for (let i = 0; i < ents.length; i++) {
      for (let j = i + 1; j < ents.length; j++) {
        const key = [ents[i], ents[j]].sort().join('|||');
        if (!pairs[key]) pairs[key] = { weight: 0, articles: new Set() };
        pairs[key].weight++;
        pairs[key].articles.add(artId);
      }
    }
  }

  for (const [key, val] of Object.entries(pairs)) {
    const [s, t] = key.split('|||');
    if (val.weight >= 1) {
      relationships.push({ source: s, target: t, weight: val.weight, articles: [...val.articles] });
    }
  }

  // 7. Get sentiment for matched entities
  let sentiments: { article_id: string; score: number; label: string }[] = [];
  if (articleIds.length > 0) {
    const sentFilter = articleIds.slice(0, 30).map((id: string) => `article_id.eq.${id}`).join(',');
    sentiments = await sb('cronos_sentiment',
      `select=article_id,score,label&or=(${sentFilter})&limit=100`
    );
  }

  // 8. Get impacts for tickers
  const tickers = uniqueEntities.filter((e: { type: string }) => e.type === 'ticker').map((e: { value: string }) => e.value);
  let impacts: unknown[] = [];
  if (tickers.length > 0) {
    const tickerFilter = tickers.map((t: string) => `ticker.eq.${t}`).join(',');
    impacts = await sb('cronos_impacts',
      `select=*,cronos_articles(title,source,published_at)&or=(${tickerFilter})&order=impact_score.desc&limit=20`
    );
  }

  return NextResponse.json({
    query: q,
    entities: [...new Map([...uniqueEntities, ...relatedEntities].map((e: { id: string }) => [e.id, e])).values()],
    articles: [
      ...articles.filter((a: { cronos_articles: unknown }) => a.cronos_articles).map((a: { cronos_articles: { id: string; title: string; source: string; published_at: string; summary: string }; relevance: number; entity_id: string }) => ({
        ...a.cronos_articles,
        relevance: a.relevance,
        entity_id: a.entity_id,
        via: 'entity',
      })),
      ...textArticles.map((a: { id: string; title: string; source: string; published_at: string; summary: string }) => ({ ...a, via: 'text' })),
    ].filter((a: { id: string }, i: number, arr: { id: string }[]) => arr.findIndex((x: { id: string }) => x.id === a.id) === i)
     .slice(0, 50),
    relationships: relationships.sort((a, b) => b.weight - a.weight).slice(0, 30),
    sentiments,
    impacts,
    meta: {
      entity_count: allEntityIds.length,
      article_count: articleIds.length,
      canonical_names: canonicals,
      tickers,
    },
  });
}
