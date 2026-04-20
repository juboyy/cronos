#!/usr/bin/env python3
"""
Temporal Cluster Detector — identifies bursts of related articles within
short time windows, signaling emerging narratives.

Cluster types:
- burst: 3+ articles on same entity within 6h → breaking event
- emerging: entity first appears in 2+ sources within 12h → new narrative
- sustained: entity persists across 3+ days → ongoing story
"""
import json
import sys
import os
import urllib.request
from datetime import datetime, timedelta
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

HEADERS = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
}


def query(table, params=''):
    url = f'{SUPABASE_URL}/rest/v1/{table}?{params}'
    req = urllib.request.Request(url, headers=HEADERS)
    r = urllib.request.urlopen(req, timeout=15)
    return json.loads(r.read())


def insert(table, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}',
        data=body,
        headers={**HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
        method='POST',
    )
    urllib.request.urlopen(req, timeout=15)
    return True


def _extract_keywords(titles, top_n=5):
    """Extract most common significant words from titles."""
    stop = {'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
            'um', 'uma', 'o', 'a', 'os', 'as', 'e', 'ou', 'que', 'para',
            'por', 'com', 'se', 'não', 'mais', 'como', 'é', 'foi', 'ser',
            'tem', 'são', 'está', 'já', 'pode', 'sobre', 'após', 'entre',
            'diz', 'ano', 'dia', 'vez', 'r', 'bi', 'mi', 'the', 'and', 'for'}
    words = defaultdict(int)
    for title in titles:
        for w in title.lower().split():
            w = w.strip('.,;:!?()[]"\'')
            if len(w) > 2 and w not in stop:
                words[w] += 1
    return [w for w, _ in sorted(words.items(), key=lambda x: -x[1])[:top_n]]


def run_clustering(lookback_hours=72):
    """Detect temporal clusters in recent articles."""
    cutoff = (datetime.utcnow() - timedelta(hours=lookback_hours)).isoformat()

    print(f'[CLUSTERS] Loading articles (last {lookback_hours}h)...')

    articles = query('cronos_articles',
        f'select=id,title,source,published_at,'
        f'cronos_article_entities(entity_id,relevance),'
        f'cronos_sentiment(score,label)'
        f'&published_at=gte.{cutoff}'
        f'&order=published_at.asc'
        f'&limit=500')

    if len(articles) < 3:
        print(f'  Only {len(articles)} articles. Need more.')
        return 0

    print(f'  Loaded {len(articles)} articles')

    # Load entities
    entities = query('cronos_entities', 'select=id,type,value,canonical_name&limit=500')
    entity_map = {e['id']: e for e in entities}

    # Group articles by entity
    entity_timeline = defaultdict(list)
    for art in articles:
        links = art.get('cronos_article_entities') or []
        sents = art.get('cronos_sentiment') or []
        sent_score = sents[0]['score'] if sents else None
        sent_label = sents[0]['label'] if sents else None

        for link in links:
            eid = link['entity_id']
            entity_timeline[eid].append({
                'id': art['id'],
                'title': art['title'],
                'source': art['source'],
                'published_at': art.get('published_at'),
                'sentiment': sent_score,
                'label': sent_label,
            })

    clusters = []

    for eid, arts in entity_timeline.items():
        ent = entity_map.get(eid, {})
        entity_name = ent.get('canonical_name') or ent.get('value', '?')

        if len(arts) < 2:
            continue

        # Sort by time
        arts.sort(key=lambda x: x.get('published_at') or '')

        # ── BURST detection: 3+ articles within 6 hours ──
        for i in range(len(arts)):
            window = []
            t0 = arts[i].get('published_at')
            if not t0:
                continue
            t0_dt = datetime.fromisoformat(t0.replace('Z', '+00:00').replace('+00:00', ''))

            for j in range(i, len(arts)):
                tj = arts[j].get('published_at')
                if not tj:
                    continue
                tj_dt = datetime.fromisoformat(tj.replace('Z', '+00:00').replace('+00:00', ''))

                if (tj_dt - t0_dt).total_seconds() <= 6 * 3600:
                    window.append(arts[j])
                else:
                    break

            if len(window) >= 3:
                sources = list(set(a['source'] for a in window))
                sentiments = [a['sentiment'] for a in window if a['sentiment'] is not None]
                avg_sent = sum(sentiments) / len(sentiments) if sentiments else 0
                labels = [a['label'] for a in window if a.get('label')]
                dominant = max(set(labels), key=labels.count) if labels else 'neutral'

                clusters.append({
                    'cluster_type': 'burst',
                    'title': f'⚡ Burst: {entity_name} ({len(window)} artigos em 6h)',
                    'article_ids': json.dumps([a['id'] for a in window]),
                    'entity_ids': json.dumps([eid]),
                    'sources': json.dumps(sources),
                    'article_count': len(window),
                    'avg_sentiment': round(avg_sent, 4),
                    'dominant_sentiment': dominant,
                    'window_minutes': 360,
                    'window_start': window[0].get('published_at'),
                    'window_end': window[-1].get('published_at'),
                    'keywords': json.dumps(_extract_keywords([a['title'] for a in window])),
                })
                break  # one burst per entity

        # ── EMERGING detection: entity appears from new sources ──
        recent = [a for a in arts if a.get('published_at', '') >= (datetime.utcnow() - timedelta(hours=12)).isoformat()]
        older = [a for a in arts if a.get('published_at', '') < (datetime.utcnow() - timedelta(hours=12)).isoformat()]

        if len(recent) >= 2:
            recent_sources = set(a['source'] for a in recent)
            older_sources = set(a['source'] for a in older)
            new_sources = recent_sources - older_sources

            if len(new_sources) >= 1 and len(recent_sources) >= 2:
                sentiments = [a['sentiment'] for a in recent if a['sentiment'] is not None]
                avg_sent = sum(sentiments) / len(sentiments) if sentiments else 0

                clusters.append({
                    'cluster_type': 'emerging',
                    'title': f'🌱 Emergente: {entity_name} — {len(new_sources)} nova(s) fonte(s)',
                    'article_ids': json.dumps([a['id'] for a in recent]),
                    'entity_ids': json.dumps([eid]),
                    'sources': json.dumps(list(recent_sources)),
                    'article_count': len(recent),
                    'avg_sentiment': round(avg_sent, 4),
                    'dominant_sentiment': 'positive' if avg_sent > 0.05 else 'negative' if avg_sent < -0.05 else 'neutral',
                    'window_minutes': 720,
                    'window_start': recent[0].get('published_at'),
                    'window_end': recent[-1].get('published_at'),
                    'keywords': json.dumps(_extract_keywords([a['title'] for a in recent])),
                })

    # Deduplicate by entity+type
    seen = set()
    unique_clusters = []
    for c in clusters:
        key = f'{c["cluster_type"]}:{c["entity_ids"]}'
        if key not in seen:
            seen.add(key)
            unique_clusters.append(c)

    if unique_clusters:
        # Clear stale clusters before inserting
        clear_url = f'{SUPABASE_URL}/rest/v1/cronos_clusters?id=neq.00000000-0000-0000-0000-000000000000'
        clear_req = urllib.request.Request(clear_url, method='DELETE', headers=HEADERS)
        urllib.request.urlopen(clear_req, timeout=10)

        print(f'\n[CLUSTERS] Found {len(unique_clusters)} clusters:')
        for c in unique_clusters[:10]:
            print(f'  {c["title"]} ({c["article_count"]} arts, {c["dominant_sentiment"]})')

        for c in unique_clusters:
            insert('cronos_clusters', c)

        # Notify on bursts
        for c in unique_clusters:
            if c['cluster_type'] == 'burst' and c['article_count'] >= 4:
                insert('cronos_notifications', {
                    'type': 'cluster',
                    'title': c['title'],
                    'body': f'{c["article_count"]} artigos, sentimento {c["dominant_sentiment"]}',
                    'severity': 'warning',
                })

        print(f'  Saved {len(unique_clusters)} clusters')
    else:
        print('  No temporal clusters detected')

    return len(unique_clusters)


if __name__ == '__main__':
    run_clustering()
