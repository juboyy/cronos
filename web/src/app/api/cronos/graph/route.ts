import { NextRequest, NextResponse } from 'next/server';

// Memgraph Bolt driver — we use the REST-like approach via a lightweight
// HTTP wrapper since Next.js serverless doesn't support raw TCP Bolt easily.
// Instead, we query Memgraph via its HTTP endpoint or a local proxy.
// For now, we use a direct fetch to a small API we'll run on Vultr.

const MEMGRAPH_API = process.env.MEMGRAPH_API_URL || 'https://memgraph.216-238-124-248.nip.io';

interface CypherResult {
  columns: string[];
  data: Record<string, unknown>[];
}

async function cypher(query: string, params: Record<string, unknown> = {}): Promise<CypherResult> {
  const res = await fetch(`${MEMGRAPH_API}/cypher`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params }),
  });
  
  if (!res.ok) {
    throw new Error(`Memgraph query failed: ${res.status} ${await res.text()}`);
  }
  
  return res.json();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'summary';
  const entity = searchParams.get('entity');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

  try {
    switch (action) {
      case 'summary': {
        // Graph overview stats
        const result = await cypher(`
          MATCH (n) 
          WITH labels(n)[0] AS label, count(n) AS cnt 
          RETURN label, cnt ORDER BY cnt DESC
        `);
        const edgeResult = await cypher(`
          MATCH ()-[r]->()
          WITH type(r) AS rel, count(r) AS cnt
          RETURN rel, cnt ORDER BY cnt DESC
        `);
        return NextResponse.json({ nodes: result.data, edges: edgeResult.data });
      }

      case 'entity': {
        // Entity neighborhood — articles, related entities, sectors
        if (!entity) return NextResponse.json({ error: 'entity param required' }, { status: 400 });
        
        const articles = await cypher(`
          MATCH (a:Article)-[r:MENTIONS]->(e:Entity)
          WHERE e.value = $entity OR e.canonical_name = $entity
          RETURN a.title AS title, a.source AS source, a.published_at AS published_at,
                 a.sentiment_score AS sentiment, r.relevance AS relevance, a.url AS url
          ORDER BY a.published_at DESC LIMIT $limit
        `, { entity, limit });
        
        const related = await cypher(`
          MATCH (e:Entity)-[r:RELATED_TO]-(other:Entity)
          WHERE e.value = $entity OR e.canonical_name = $entity
          RETURN other.value AS entity, other.canonical_name AS name, 
                 other.sector AS sector, r.weight AS weight
          ORDER BY r.weight DESC LIMIT 10
        `, { entity });
        
        return NextResponse.json({ entity, articles: articles.data, related: related.data });
      }

      case 'network': {
        // Full co-mention network for visualization
        const nodes = await cypher(`
          MATCH (e:Entity)<-[r:MENTIONS]-(a:Article)
          RETURN e.value AS id, e.canonical_name AS label, e.sector AS sector,
                 count(a) AS mentions
          ORDER BY mentions DESC LIMIT $limit
        `, { limit });
        
        const edges = await cypher(`
          MATCH (e1:Entity)-[r:RELATED_TO]->(e2:Entity)
          WHERE r.weight >= 2
          RETURN e1.value AS source, e2.value AS target, r.weight AS weight
          ORDER BY r.weight DESC LIMIT 100
        `);
        
        return NextResponse.json({ nodes: nodes.data, edges: edges.data });
      }

      case 'sources': {
        // Source health with sentiment distribution
        const result = await cypher(`
          MATCH (a:Article)-[:FROM_SOURCE]->(s:Source)
          WITH s.name AS source, count(a) AS total,
               avg(a.sentiment_score) AS avg_sent,
               max(a.published_at) AS latest
          RETURN source, total, avg_sent, latest
          ORDER BY total DESC
        `);
        return NextResponse.json({ sources: result.data });
      }

      case 'transmission': {
        // Transmission chain: how does news about entity X affect entity Y?
        if (!entity) return NextResponse.json({ error: 'entity param required' }, { status: 400 });
        
        const chain = await cypher(`
          MATCH path = (e1:Entity)<-[:MENTIONS]-(a:Article)-[:MENTIONS]->(e2:Entity)
          WHERE (e1.value = $entity OR e1.canonical_name = $entity)
            AND e1 <> e2
          WITH e2.value AS affected, e2.canonical_name AS name,
               count(a) AS shared_articles,
               avg(a.sentiment_score) AS avg_sentiment,
               collect(a.title)[0..3] AS sample_titles
          RETURN affected, name, shared_articles, avg_sentiment, sample_titles
          ORDER BY shared_articles DESC LIMIT $limit
        `, { entity, limit });
        
        return NextResponse.json({ entity, chain: chain.data });
      }

      case 'sectors': {
        // Sector sentiment heatmap
        const result = await cypher(`
          MATCH (a:Article)-[:MENTIONS]->(e:Entity)-[:IN_SECTOR]->(s:Sector)
          WITH s.name AS sector, count(DISTINCT a) AS articles,
               avg(a.sentiment_score) AS avg_sentiment,
               count(DISTINCT e) AS entities
          RETURN sector, articles, avg_sentiment, entities
          ORDER BY articles DESC
        `);
        return NextResponse.json({ sectors: result.data });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
