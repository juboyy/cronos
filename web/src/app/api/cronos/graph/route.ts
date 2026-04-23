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

/* ── Canonical alias table for B3 tickers ── */
const ALIASES: Record<string, string> = {
  'PETR3': 'Petrobras', 'PETR4': 'Petrobras',
  'VALE3': 'Vale',
  'ITUB3': 'Itaú Unibanco', 'ITUB4': 'Itaú Unibanco',
  'BBDC3': 'Bradesco', 'BBDC4': 'Bradesco',
  'BBAS3': 'Banco do Brasil',
  'WEGE3': 'WEG',
  'ABEV3': 'Ambev',
  'RENT3': 'Localiza',
  'SUZB3': 'Suzano',
  'JBSS3': 'JBS',
  'ELET3': 'Eletrobras', 'ELET6': 'Eletrobras',
  'B3SA3': 'B3',
  'RADL3': 'Raia Drogasil',
  'EMBR3': 'Embraer',
  'NTCO3': 'Natura',
  'CSNA3': 'CSN',
  'VIVT3': 'Vivo',
  'PRIO3': 'PetroRio',
  'BRKM5': 'Braskem',
  'GGBR4': 'Gerdau',
  'KLBN11': 'Klabin',
  'COGN3': 'Cogna',
  'CSAN3': 'Cosan',
  'MRFG3': 'Marfrig',
  'BRFS3': 'BRF',
  'AZUL4': 'Azul',
  'ENEV3': 'Eneva',
  'FLRY3': 'Fleury',
  'IGTI11': 'Iguatemi',
  'IRBR3': 'IRB Brasil',
  'USIM5': 'Usiminas',
  'BPAC11': 'BTG Pactual',
  'RRRP3': 'PetroRio',
  'MRVE3': 'MRV',
};

/* ── Sector classification ── */
const SECTORS: Record<string, string> = {
  'Petrobras': 'Energia', 'PetroRio': 'Energia', 'Eneva': 'Energia', 'Eletrobras': 'Energia', 'Cosan': 'Energia',
  'Vale': 'Mineração', 'CSN': 'Siderurgia', 'Gerdau': 'Siderurgia', 'Usiminas': 'Siderurgia', 'Braskem': 'Petroquímica',
  'Itaú Unibanco': 'Financeiro', 'Bradesco': 'Financeiro', 'Banco do Brasil': 'Financeiro', 'BTG Pactual': 'Financeiro', 'B3': 'Financeiro', 'IRB Brasil': 'Financeiro',
  'JBS': 'Alimentos', 'BRF': 'Alimentos', 'Marfrig': 'Alimentos', 'Ambev': 'Alimentos',
  'WEG': 'Indústria', 'Embraer': 'Indústria',
  'Localiza': 'Serviços', 'Azul': 'Serviços', 'Vivo': 'Telecom',
  'Natura': 'Consumo', 'Raia Drogasil': 'Consumo', 'Fleury': 'Saúde',
  'Suzano': 'Papel & Celulose', 'Klabin': 'Papel & Celulose',
  'Cogna': 'Educação', 'Iguatemi': 'Imobiliário',
};

/* ── Macro indicators (synthetic nodes) ── */
const MACRO_NODES = [
  { id: 'macro_selic', label: 'SELIC', name: 'Taxa Selic', type: 'macro', sector: 'Política Monetária' },
  { id: 'macro_ipca', label: 'IPCA', name: 'Inflação IPCA', type: 'macro', sector: 'Inflação' },
  { id: 'macro_ibov', label: 'IBOV', name: 'Ibovespa', type: 'macro', sector: 'Índice' },
  { id: 'macro_usd', label: 'USD/BRL', name: 'Dólar', type: 'macro', sector: 'Câmbio' },
  { id: 'macro_pib', label: 'PIB', name: 'PIB Brasil', type: 'macro', sector: 'Atividade' },
];

const MACRO_KEYWORDS: Record<string, string[]> = {
  'macro_selic': ['selic', 'juros', 'copom', 'taxa básica'],
  'macro_ipca': ['ipca', 'inflação', 'deflação', 'preços'],
  'macro_ibov': ['ibovespa', 'ibov', 'bolsa', 'b3 índice'],
  'macro_usd': ['dólar', 'câmbio', 'usd', 'real', 'forex'],
  'macro_pib': ['pib', 'gdp', 'crescimento econômico', 'atividade econômica'],
};

export async function GET() {
  try {
    const [entities, impacts, ae, patterns, articles] = await Promise.all([
      sq('cronos_entities', 'select=*&limit=200'),
      sq('cronos_impacts', 'select=*&limit=3000'),
      sq('cronos_article_entities', 'select=article_id,entity_id&limit=5000'),
      sq('cronos_patterns', 'select=*&limit=200'),
      sq('cronos_articles', 'select=id,title&limit=2000'),
    ]);

    /* ── Step 1: Entity Resolution ── */
    // Build canonical mapping: group entities by canonical_name
    const canonGroups: Record<string, typeof entities> = {};
    for (const e of entities) {
      const cn = (e.canonical_name || e.value || '').trim();
      if (!cn) continue;
      (canonGroups[cn] ||= []).push(e);
    }

    // Pick master per canonical group (prefer ticker)
    type MasterNode = {
      id: string; label: string; name: string; type: string; sector: string;
      allIds: string[]; ticker: string | null; companyName: string | null;
    };
    const masters: Record<string, MasterNode> = {};
    const idToMaster: Record<string, string> = {};

    for (const [cn, group] of Object.entries(canonGroups)) {
      const ticker = group.find(e => e.type === 'ticker');
      const company = group.find(e => e.type === 'company');
      const master = ticker || company || group[0];
      const mId = master.id;
      const allIds = group.map(e => e.id);

      masters[cn] = {
        id: mId,
        label: ticker?.value || (master.value?.length <= 8 ? master.value : cn),
        name: cn,
        type: 'company', // all resolved entities are companies
        sector: SECTORS[cn] || master.sector || 'Outros',
        allIds,
        ticker: ticker?.value || null,
        companyName: company?.value || cn,
      };
      for (const eid of allIds) idToMaster[eid] = mId;
    }

    /* ── Step 2: Impact aggregation per master ── */
    type Stats = { count: number; totSent: number; totScore: number; totDelta: number; deltaN: number; volAnom: number };
    const masterStats: Record<string, Stats> = {};

    for (const imp of impacts) {
      const mid = idToMaster[imp.entity_id] || imp.entity_id;
      if (!masterStats[mid]) masterStats[mid] = { count: 0, totSent: 0, totScore: 0, totDelta: 0, deltaN: 0, volAnom: 0 };
      const s = masterStats[mid];
      s.count++;
      s.totSent += imp.sentiment_score || 0;
      s.totScore += Math.abs(imp.impact_score || 0);
      if (imp.delta_1d != null) { s.totDelta += imp.delta_1d; s.deltaN++; }
      if (imp.volume_anomaly) s.volAnom++;
    }

    /* ── Step 3: Patterns per master (by ticker label) ── */
    const patMap: Record<string, { pattern_type: string; description: string; avg_impact: number; occurrences: number }[]> = {};
    for (const p of patterns) {
      if (!patMap[p.ticker]) patMap[p.ticker] = [];
      patMap[p.ticker].push({ pattern_type: p.pattern_type, description: p.description, avg_impact: p.avg_impact, occurrences: p.occurrences });
    }

    /* ── Step 4: Macro node detection from article titles ── */
    const articleTitle: Record<string, string> = {};
    for (const a of articles) articleTitle[a.id] = (a.title || '').toLowerCase();

    const macroArticles: Record<string, Set<string>> = {};
    for (const [macroId, keywords] of Object.entries(MACRO_KEYWORDS)) {
      macroArticles[macroId] = new Set();
      for (const a of articles) {
        const title = (a.title || '').toLowerCase();
        if (keywords.some(kw => title.includes(kw))) {
          macroArticles[macroId].add(a.id);
        }
      }
    }

    /* ── Step 5: Build nodes array ── */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodes: any[] = [];
    const nodeIds = new Set<string>();

    // Company nodes (resolved)
    for (const m of Object.values(masters)) {
      const s = masterStats[m.id];
      nodes.push({
        id: m.id,
        label: m.label,
        name: m.name,
        type: m.type,
        sector: m.sector,
        ticker: m.ticker,
        companyName: m.companyName,
        impactCount: s?.count || 0,
        avgSentiment: s ? Math.round((s.totSent / s.count) * 100) / 100 : 0,
        avgImpact: s ? Math.round((s.totScore / s.count) * 100) / 100 : 0,
        avgDelta: s && s.deltaN > 0 ? Math.round((s.totDelta / s.deltaN) * 100) / 100 : null,
        volAnomalies: s?.volAnom || 0,
        patterns: patMap[m.label]?.slice(0, 5) || [],
      });
      nodeIds.add(m.id);
    }

    // Macro nodes
    for (const mn of MACRO_NODES) {
      const articleCount = macroArticles[mn.id]?.size || 0;
      if (articleCount > 0) {
        nodes.push({
          ...mn,
          impactCount: articleCount,
          avgSentiment: 0,
          avgImpact: 0,
          avgDelta: null,
          volAnomalies: 0,
          patterns: [],
        });
        nodeIds.add(mn.id);
      }
    }

    /* ── Step 6: Co-occurrence edges (resolved) ── */
    const artToMasters: Record<string, Set<string>> = {};
    for (const a of ae) {
      const mid = idToMaster[a.entity_id] || a.entity_id;
      if (!nodeIds.has(mid)) continue;
      (artToMasters[a.article_id] ||= new Set()).add(mid);
    }

    // Add macro nodes to article mappings
    for (const [macroId, artSet] of Object.entries(macroArticles)) {
      for (const artId of artSet) {
        (artToMasters[artId] ||= new Set()).add(macroId);
      }
    }

    const edgeCnt: Record<string, number> = {};
    for (const masters of Object.values(artToMasters)) {
      const ids = [...masters].sort();
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const k = `${ids[i]}|${ids[j]}`;
          edgeCnt[k] = (edgeCnt[k] || 0) + 1;
        }
      }
    }

    const edges = Object.entries(edgeCnt)
      .filter(([, w]) => w >= 2)
      .map(([k, weight]) => {
        const [source, target] = k.split('|');
        return { source, target, weight };
      })
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 300);

    /* ── Step 7: Extract unique sectors for layout ── */
    const sectors = [...new Set(nodes.map(n => n.sector))].sort();

    return NextResponse.json({
      nodes,
      edges,
      sectors,
      meta: {
        totalEntities: entities.length,
        resolvedNodes: nodes.length,
        mergedGroups: Object.values(canonGroups).filter(g => g.length > 1).length,
        totalEdges: edges.length,
        macroNodes: MACRO_NODES.filter(mn => macroArticles[mn.id]?.size > 0).length,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message, nodes: [], edges: [], sectors: [] }, { status: 500 });
  }
}
