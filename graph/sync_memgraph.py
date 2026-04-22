#!/usr/bin/env python3
"""
Cronos → Memgraph Graph Sync
Reads entities, articles, sentiment, and article-entity links from Supabase
and builds a knowledge graph in Memgraph via Bolt protocol.

Graph Schema:
  (:Entity {id, type, value, canonical_name, sector})
  (:Article {id, title, source, url, published_at, summary})
  (:Sentiment {label, score, confidence})
  (:Source {name})
  (:Sector {name})
  
  (Article)-[:MENTIONS {relevance, context}]->(Entity)
  (Article)-[:HAS_SENTIMENT]->(Sentiment)  -- embedded
  (Article)-[:FROM_SOURCE]->(Source)
  (Entity)-[:IN_SECTOR]->(Sector)
  (Entity)-[:RELATED_TO {weight}]->(Entity)  -- co-mention in same article
"""

import os
import json
import sys
import urllib.request
import ssl
from itertools import combinations
from collections import defaultdict

# --- Config ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://apkflemxmsbdltziouls.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
MEMGRAPH_HOST = os.environ.get("MEMGRAPH_HOST", "localhost")
MEMGRAPH_PORT = int(os.environ.get("MEMGRAPH_PORT", "7687"))

# Try to import neo4j driver (compatible with Memgraph Bolt)
try:
    from neo4j import GraphDatabase
except ImportError:
    print("Installing neo4j driver...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "neo4j", "-q"])
    from neo4j import GraphDatabase


def supabase_get(table: str, params: str = "", limit: int = 1000) -> list:
    """Fetch from Supabase REST API."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    url = f"{SUPABASE_URL}/rest/v1/{table}?limit={limit}"
    if params:
        url += f"&{params}"
    
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Accept": "application/json",
    })
    
    with urllib.request.urlopen(req, context=ctx) as resp:
        return json.loads(resp.read())


def sync(full: bool = False):
    """Main sync: Supabase → Memgraph."""
    
    print("📡 Fetching data from Supabase...")
    entities = supabase_get("cronos_entities")
    articles = supabase_get("cronos_articles", "select=id,title,source,url,published_at,summary", limit=2000)
    sentiments = supabase_get("cronos_sentiment", limit=2000)
    article_entities = supabase_get("cronos_article_entities", limit=5000)
    
    print(f"  Entities: {len(entities)}")
    print(f"  Articles: {len(articles)}")
    print(f"  Sentiments: {len(sentiments)}")
    print(f"  Article-Entity links: {len(article_entities)}")
    
    # Build sentiment lookup: article_id -> {label, score}
    sent_map = {}
    for s in sentiments:
        sent_map[s["article_id"]] = {"label": s.get("label", "neutral"), "score": s.get("score", 0), "confidence": s.get("confidence", 0)}
    
    # Build co-mention map: article_id -> [entity_ids]
    article_entity_map = defaultdict(list)
    for ae in article_entities:
        article_entity_map[ae["article_id"]].append({
            "entity_id": ae["entity_id"],
            "relevance": ae.get("relevance", 0.5),
            "context": ae.get("context", ""),
        })
    
    # Connect to Memgraph
    print(f"\n🔌 Connecting to Memgraph at bolt://{MEMGRAPH_HOST}:{MEMGRAPH_PORT}...")
    driver = GraphDatabase.driver(f"bolt://{MEMGRAPH_HOST}:{MEMGRAPH_PORT}")
    
    with driver.session() as session:
        if full:
            print("⚠️  Full sync: clearing existing graph...")
            session.run("MATCH (n) DETACH DELETE n")
        
        # Create indexes
        print("📇 Creating indexes...")
        for idx in [
            "CREATE INDEX ON :Entity(id)",
            "CREATE INDEX ON :Entity(value)",
            "CREATE INDEX ON :Article(id)",
            "CREATE INDEX ON :Source(name)",
            "CREATE INDEX ON :Sector(name)",
        ]:
            try:
                session.run(idx)
            except Exception:
                pass  # Index may already exist
        
        # 1. Upsert Entities
        print("\n🏗️  Syncing entities...")
        for e in entities:
            session.run("""
                MERGE (ent:Entity {id: $id})
                SET ent.type = $type,
                    ent.value = $value,
                    ent.canonical_name = $canonical_name,
                    ent.sector = $sector
            """, {
                "id": e["id"],
                "type": e.get("type", "unknown"),
                "value": e.get("value", ""),
                "canonical_name": e.get("canonical_name", ""),
                "sector": e.get("sector", ""),
            })
            
            # Create sector node + relationship
            sector = e.get("sector")
            if sector:
                session.run("""
                    MERGE (s:Sector {name: $sector})
                    WITH s
                    MATCH (ent:Entity {id: $entity_id})
                    MERGE (ent)-[:IN_SECTOR]->(s)
                """, {"sector": sector, "entity_id": e["id"]})
        
        print(f"  ✅ {len(entities)} entities upserted")
        
        # 2. Upsert Articles + Source nodes + Sentiment
        print("📰 Syncing articles...")
        sources = set()
        for a in articles:
            src = a.get("source", "unknown")
            sources.add(src)
            sent = sent_map.get(a["id"], {"label": "neutral", "score": 0, "confidence": 0})
            
            session.run("""
                MERGE (art:Article {id: $id})
                SET art.title = $title,
                    art.source = $source,
                    art.url = $url,
                    art.published_at = $published_at,
                    art.summary = $summary,
                    art.sentiment_label = $sent_label,
                    art.sentiment_score = $sent_score,
                    art.sentiment_confidence = $sent_confidence
            """, {
                "id": a["id"],
                "title": a.get("title", ""),
                "source": src,
                "url": a.get("url", ""),
                "published_at": a.get("published_at", ""),
                "summary": (a.get("summary") or "")[:500],
                "sent_label": sent["label"],
                "sent_score": sent["score"],
                "sent_confidence": sent["confidence"],
            })
            
            # Article -> Source
            session.run("""
                MERGE (s:Source {name: $source})
                WITH s
                MATCH (art:Article {id: $art_id})
                MERGE (art)-[:FROM_SOURCE]->(s)
            """, {"source": src, "art_id": a["id"]})
        
        print(f"  ✅ {len(articles)} articles, {len(sources)} sources upserted")
        
        # 3. Article-Entity MENTIONS relationships
        print("🔗 Syncing article-entity links...")
        link_count = 0
        for ae in article_entities:
            session.run("""
                MATCH (art:Article {id: $art_id})
                MATCH (ent:Entity {id: $ent_id})
                MERGE (art)-[r:MENTIONS]->(ent)
                SET r.relevance = $relevance,
                    r.context = $context
            """, {
                "art_id": ae["article_id"],
                "ent_id": ae["entity_id"],
                "relevance": ae.get("relevance", 0.5),
                "context": (ae.get("context") or "")[:200],
            })
            link_count += 1
        
        print(f"  ✅ {link_count} MENTIONS relationships")
        
        # 4. Co-mention RELATED_TO edges between entities
        print("🕸️  Building co-mention graph...")
        co_mentions = defaultdict(int)
        for art_id, ents in article_entity_map.items():
            ent_ids = [e["entity_id"] for e in ents]
            for a, b in combinations(sorted(ent_ids), 2):
                co_mentions[(a, b)] += 1
        
        for (a, b), weight in co_mentions.items():
            session.run("""
                MATCH (e1:Entity {id: $a})
                MATCH (e2:Entity {id: $b})
                MERGE (e1)-[r:RELATED_TO]->(e2)
                SET r.weight = $weight
            """, {"a": a, "b": b, "weight": weight})
        
        print(f"  ✅ {len(co_mentions)} RELATED_TO edges (co-mentions)")
        
        # 5. Stats
        result = session.run("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY count DESC")
        print("\n📊 Graph Summary:")
        for record in result:
            print(f"  {record['label']}: {record['count']}")
        
        result = session.run("MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count ORDER BY count DESC")
        print("  Relationships:")
        for record in result:
            print(f"    {record['type']}: {record['count']}")
    
    driver.close()
    print("\n✅ Sync complete!")


if __name__ == "__main__":
    full = "--full" in sys.argv
    sync(full=full)
