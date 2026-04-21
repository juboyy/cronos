import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery, SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';
import { Entity } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [articles, articleEntities, sentiments, impacts] = await Promise.all([
      supabaseQuery('cronos_articles', `id=eq.${id}&limit=1`),
      supabaseQuery(
        'cronos_article_entities',
        `article_id=eq.${id}&select=relevance,context,cronos_entities(id,type,value,canonical_name,sector)`
      ),
      supabaseQuery('cronos_sentiment', `article_id=eq.${id}&select=*`),
      supabaseQuery('cronos_impacts', `article_id=eq.${id}&select=*&order=impact_score.desc`),
    ]);

    if (!articles.length) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = articles[0];
    const entities = articleEntities
      .map((ae: any) => ({
        ...ae.cronos_entities,
        relevance: ae.relevance,
        context: ae.context,
      }))
      .filter((e: any) => e.id);

    const entityIds = entities.map((e: any) => e.id);
    const tickers = entities.filter((e: any) => e.type === 'ticker').map((e: any) => e.value);

    const [
      prices,
      relatedLinks,
      correlations,
      clusters,
    ] = await Promise.all([
      // Price history for tickers
      tickers.length > 0
        ? supabaseQuery(
            'cronos_prices',
            `ticker=in.(${tickers.join(',')})&select=ticker,date,close,volume&order=date.desc&limit=90`
          )
        : Promise.resolve([]),

      // Related articles through shared entities
      entityIds.length > 0
        ? supabaseQuery(
            'cronos_article_entities',
            `entity_id=in.(${entityIds.join(',')})&article_id=neq.${id}&select=article_id,entity_id,relevance,cronos_articles(id,title,source,published_at,url)&limit=50`
          )
        : Promise.resolve([]),

      // Cross-source correlations involving these entities
      entityIds.length > 0
        ? supabaseQuery(
            'cronos_correlations',
            `select=*&or=(entity=in.(${entities.map((e: any) => encodeURIComponent(e.canonical_name || e.value)).join(',')}))&order=signal_strength.desc&limit=20`
          ).catch(() => [])
        : Promise.resolve([]),

      // Temporal clusters mentioning these entities
      supabaseQuery(
        'cronos_clusters',
        `select=*&order=first_seen.desc&limit=20`
      ).catch(() => []),
    ]);

    const relatedMap = new Map<string, { article: unknown; sharedEntities: string[]; totalRelevance: number }>();
    for (const link of relatedLinks) {
      if (!link.cronos_articles) continue;
      const rid = link.cronos_articles.id;
      if (!relatedMap.has(rid)) {
        relatedMap.set(rid, {
          article: link.cronos_articles,
          sharedEntities: [link.entity_id],
          totalRelevance: link.relevance || 0.5,
        });
      } else {
        const entry = relatedMap.get(rid)!;
        entry.sharedEntities.push(link.entity_id);
        entry.totalRelevance += link.relevance || 0.5;
      }
    }

    const relatedArticles = Array.from(relatedMap.values())
      .sort((a, b) => b.sharedEntities.length - a.sharedEntities.length || b.totalRelevance - a.totalRelevance)
      .slice(0, 8)
      .map((r: any) => ({
        ...r.article,
        sharedEntityCount: r.sharedEntities.length,
        connectionStrength: r.totalRelevance,
      }));

    const graphNodes: unknown[] = [];
    const graphEdges: unknown[] = [];
    const nodeSet = new Set<string>();

    const addNode = (id: string, type: string, label: string, group: string, meta?: any) => {
      if (nodeSet.has(id)) return;
      nodeSet.add(id);
      graphNodes.push({ id, type, label, group, ...(meta || {}) });
    };

    // Central article
    addNode(`article:${id}`, 'article', article.title?.slice(0, 60) || 'Artigo', 'article', {
      mass: 3,
      ...(article as any),
      source: article.source,
      published_at: article.published_at,
    });

    // Direct entities
    for (const e of entities) {
      const nodeId = `entity:${e.id}`;
      addNode(nodeId, e.type, e.canonical_name || e.value, e.type, {
        sector: e.sector,
        relevance: e.relevance,
      });
      graphEdges.push({
        source: `article:${id}`,
        target: nodeId,
        weight: e.relevance || 0.5,
        label: e.context || 'mencionado',
        type: 'mentions',
      });

      // Sector → entity edge
      if (e.sector) {
        const sectorId = `sector:${e.sector}`;
        addNode(sectorId, 'sector', e.sector, 'sector', { mass: 1.5 });
        graphEdges.push({
          source: nodeId,
          target: sectorId,
          weight: 0.3,
          label: 'setor',
          type: 'belongs_to',
        });
      }
    }

    // Related articles as graph nodes (creates cross-article connections)
    for (const rel of relatedArticles.slice(0, 5)) {
      const relNodeId = `article:${rel.id}`;
      addNode(relNodeId, 'article', rel.title?.slice(0, 50) || '...', 'related_article', {
        source: rel.source,
        published_at: rel.published_at,
        mass: 1,
        ...(rel as any),
      });

      // Connect related article to shared entities
      const relEntityLinks = relatedLinks.filter(
        (l: any) => l.cronos_articles?.id === rel.id
      );
      for (const link of relEntityLinks) {
        const entityNodeId = `entity:${link.entity_id}`;
        if (nodeSet.has(entityNodeId)) {
          graphEdges.push({
            source: relNodeId,
            target: entityNodeId,
            weight: (link.relevance || 0.3) * 0.7,
            label: 'mencionado',
            type: 'mentions',
          });
        }
      }
    }

    // Correlations as edges between entities
    for (const corr of correlations) {
      const entityNode = graphNodes.find(
        (n: any) =>
          (n.type !== 'article' && n.type !== 'sector') &&
          (n.label === corr.entity || n.label?.includes(corr.entity))
      );
      if (entityNode && corr.sources) {
        // Add correlation metadata as an event node
        const corrId = `correlation:${corr.id || corr.entity}`;
        addNode(corrId, 'event', `${corr.entity} [${corr.source_count || '?'} fontes]`, 'event', {
          signal_strength: corr.signal_strength,
          sentiment_consensus: corr.avg_sentiment,
        });
        graphEdges.push({
          source: (entityNode as any).id,
          target: corrId,
          weight: corr.signal_strength || 0.5,
          label: 'correlação',
          type: 'correlation',
        });
      }
    }

    // Impact nodes (market effects)
    for (const imp of impacts) {
      const impactId = `impact:${imp.ticker}`;
      addNode(impactId, 'impact', `${imp.ticker} ${imp.delta_1d != null ? (imp.delta_1d > 0 ? '+' : '') + imp.delta_1d.toFixed(1) + '%' : ''}`, 'impact', {
        impact_score: imp.impact_score,
        delta_1d: imp.delta_1d,
        volume_anomaly: imp.volume_anomaly,
      });

      // Connect impact to its ticker entity (if exists)
      const tickerEntity = graphNodes.find(
        (n: any) => n.type === 'ticker' && n.label === imp.ticker
      );
      if (tickerEntity) {
        graphEdges.push({
          source: (tickerEntity as any).id,
          target: impactId,
          weight: imp.impact_score || 0.5,
          label: 'impacto de mercado',
          type: 'market_impact',
        });
      } else {
        // Direct link from article to impact
        graphEdges.push({
          source: `article:${id}`,
          target: impactId,
          weight: imp.impact_score || 0.5,
          label: 'impacto',
          type: 'market_impact',
        });
      }
    }

    const transmissionChain = impacts.map((imp: any) => ({
      ticker: imp.ticker,
      sentiment: sentiments[0]?.score ?? null,
      delta_1d: imp.delta_1d,
      impact_score: imp.impact_score,
      volume_anomaly: imp.volume_anomaly,
    }));

    // Temporal context — filter clusters that mention our entities
    const entityNames = entities.map((e: any) => (e.canonical_name || e.value || '').toLowerCase());
    const relevantClusters = clusters.filter((c: any) => {
      const keywords = (c.keywords || []).map((k: string) => k.toLowerCase());
      return entityNames.some((name: string) => keywords.some((k: string) => name.includes(k) || k.includes(name)));
    }).slice(0, 5);

    return NextResponse.json({
      article,
      entities,
      sentiments,
      impacts,
      prices,
      relatedArticles,
      correlations: correlations.slice(0, 10),
      clusters: relevantClusters,
      graph: { nodes: graphNodes, edges: graphEdges },
      transmissionChain,
      meta: {
        entityCount: entities.length,
        relatedCount: relatedArticles.length,
        correlationCount: correlations.length,
        graphNodeCount: graphNodes.length,
        graphEdgeCount: graphEdges.length,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
