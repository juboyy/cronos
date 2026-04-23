import { NextResponse } from 'next/server';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';

async function sq(table: string, params: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    next: { revalidate: 120 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function GET() {
  try {
    const [entities, impacts, ae, patterns] = await Promise.all([
      sq('cronos_entities', 'select=*&limit=100'),
      sq('cronos_impacts', 'select=*&limit=2000'),
      sq('cronos_article_entities', 'select=article_id,entity_id&limit=3000'),
      sq('cronos_patterns', 'select=*&limit=100'),
    ]);

    // Impact stats keyed by entity_id AND ticker
    type Stats = { count: number; totSent: number; totScore: number; totDelta: number; deltaN: number; volAnom: number };
    const byEntityId: Record<string, Stats> = {};
    const byTicker: Record<string, Stats> = {};

    for (const imp of impacts) {
      const pairs: [string | undefined, Record<string, Stats>][] = [[imp.entity_id, byEntityId], [imp.ticker, byTicker]];
      for (const [key, map] of pairs) {
        if (!key) continue;
        if (!map[key]) map[key] = { count: 0, totSent: 0, totScore: 0, totDelta: 0, deltaN: 0, volAnom: 0 };
        const s = map[key];
        s.count++;
        s.totSent += imp.sentiment_score || 0;
        s.totScore += Math.abs(imp.impact_score || 0);
        if (imp.delta_1d != null) { s.totDelta += imp.delta_1d; s.deltaN++; }
        if (imp.volume_anomaly) s.volAnom++;
      }
    }

    // Patterns grouped by ticker
    const patMap: Record<string, { pattern_type: string; description: string; avg_impact: number; occurrences: number }[]> = {};
    for (const p of patterns) {
      if (!patMap[p.ticker]) patMap[p.ticker] = [];
      patMap[p.ticker].push({ pattern_type: p.pattern_type, description: p.description, avg_impact: p.avg_impact, occurrences: p.occurrences });
    }

    // Build nodes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodes = entities.map((e: any) => {
      const label = e.entity_value || e.value || e.ticker || 'unknown';
      const s = byEntityId[e.id] || byTicker[label] || null;
      return {
        id: e.id,
        label,
        name: e.canonical_name || label,
        type: e.entity_type || e.type || 'ticker',
        sector: e.sector || 'Outros',
        sourceCount: e.source_count || 0,
        signalStrength: e.signal_strength || 0,
        impactCount: s?.count || 0,
        avgSentiment: s ? Math.round((s.totSent / s.count) * 100) / 100 : 0,
        avgImpact: s ? Math.round((s.totScore / s.count) * 100) / 100 : 0,
        avgDelta: s && s.deltaN > 0 ? Math.round((s.totDelta / s.deltaN) * 100) / 100 : null,
        volAnomalies: s?.volAnom || 0,
        patterns: patMap[label]?.slice(0, 5) || [],
      };
    });

    // Edges from article co-occurrence
    const artMap: Record<string, string[]> = {};
    for (const a of ae) {
      if (!artMap[a.article_id]) artMap[a.article_id] = [];
      artMap[a.article_id].push(a.entity_id);
    }
    const edgeCnt: Record<string, number> = {};
    for (const ids of Object.values(artMap)) {
      if (ids.length < 2) continue;
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const k = [ids[i], ids[j]].sort().join('|');
          edgeCnt[k] = (edgeCnt[k] || 0) + 1;
        }
    }

    const nodeSet = new Set(nodes.map((n: { id: string }) => n.id));
    const edges = Object.entries(edgeCnt)
      .filter(([, w]) => w >= 2)
      .map(([k, weight]) => { const [source, target] = k.split('|'); return { source, target, weight }; })
      .filter(e => nodeSet.has(e.source) && nodeSet.has(e.target))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 200);

    return NextResponse.json({ nodes, edges });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message, nodes: [], edges: [] }, { status: 500 });
  }
}
