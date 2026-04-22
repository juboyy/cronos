import { NextRequest, NextResponse } from 'next/server';

const MEMGRAPH_API =
  process.env.MEMGRAPH_API_URL || 'https://memgraph.216-238-124-248.nip.io';

export const dynamic = 'force-dynamic';

async function cypher(query: string) {
  const res = await fetch(`${MEMGRAPH_API}/cypher`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(8000),
  });
  return res.json();
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || 'summary';

  try {
    switch (action) {
      case 'summary': {
        const stats = await cypher(
          `MATCH (n) WITH labels(n)[0] AS label, count(n) AS cnt RETURN label, cnt ORDER BY cnt DESC`
        );
        const rels = await cypher(
          `MATCH ()-[r]->() WITH type(r) AS rel, count(r) AS cnt RETURN rel, cnt ORDER BY cnt DESC`
        );
        return NextResponse.json({
          success: true,
          nodes: stats.data,
          relationships: rels.data,
        });
      }

      case 'network': {
        const limit = req.nextUrl.searchParams.get('limit') || '30';
        const data = await cypher(
          `MATCH (e1:Entity)-[r:RELATED_TO]->(e2:Entity)
           RETURN e1.canonical_name AS source, e2.canonical_name AS target,
                  r.weight AS weight, e1.sector AS source_sector, e2.sector AS target_sector
           ORDER BY r.weight DESC LIMIT ${parseInt(limit)}`
        );
        return NextResponse.json({ success: true, data: data.data });
      }

      case 'entity': {
        const entity = req.nextUrl.searchParams.get('entity');
        if (!entity)
          return NextResponse.json(
            { success: false, message: 'entity required' },
            { status: 400 }
          );
        const info = await cypher(
          `MATCH (e:Entity) WHERE e.canonical_name = '${entity}' OR e.value = '${entity}'
           OPTIONAL MATCH (a:Article)-[:MENTIONS]->(e)
           RETURN e.canonical_name AS name, e.type AS type, e.sector AS sector,
                  count(a) AS mentions, avg(a.sentiment_score) AS avg_sentiment
           LIMIT 1`
        );
        const related = await cypher(
          `MATCH (e:Entity)-[r:RELATED_TO]-(other:Entity)
           WHERE e.canonical_name = '${entity}' OR e.value = '${entity}'
           RETURN other.canonical_name AS name, other.sector AS sector, r.weight AS weight
           ORDER BY r.weight DESC LIMIT 10`
        );
        return NextResponse.json({
          success: true,
          entity: info.data?.[0] || null,
          related: related.data || [],
        });
      }

      case 'sectors': {
        const data = await cypher(
          `MATCH (e:Entity)-[:IN_SECTOR]->(s:Sector)
           OPTIONAL MATCH (a:Article)-[:MENTIONS]->(e)
           WITH s.name AS sector, count(DISTINCT e) AS entities,
                count(a) AS mentions, avg(a.sentiment_score) AS avg_sentiment
           RETURN sector, entities, mentions, avg_sentiment
           ORDER BY mentions DESC`
        );
        return NextResponse.json({ success: true, data: data.data });
      }

      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch {
    return NextResponse.json({ success: false, message: 'Conexão falhou' });
  }
}
