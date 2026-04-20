#!/usr/bin/env python3
"""
Cross-Source Correlator — finds entities mentioned across multiple independent sources
within a time window, measuring consensus and signal strength.

Signal strength = source_count × consensus × |avg_sentiment|
A ticker mentioned negatively by 4+ sources = strong bearish signal.
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

WINDOW_HOURS = 24  # look for cross-source mentions within 24h


def query(table, params=''):
    url = f'{SUPABASE_URL}/rest/v1/{table}?{params}'
    req = urllib.request.Request(url, headers=HEADERS)
    r = urllib.request.urlopen(req, timeout=15)
    return json.loads(r.read())


def upsert(table, data):
    body = json.dumps(data if isinstance(data, list) else [data]).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}',
        data=body,
        headers={**HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
        method='POST',
    )
    urllib.request.urlopen(req, timeout=15)
    return True


def run_correlations(window_hours=WINDOW_HOURS, lookback_hours=48):
    """Find entities mentioned by 2+ sources within a time window."""
    cutoff = (datetime.utcnow() - timedelta(hours=lookback_hours)).isoformat()

    print(f'[CORRELATOR] Loading recent articles (last {lookback_hours}h)...')

    articles = query('cronos_articles',
        f'select=id,title,source,published_at,url,'
        f'cronos_article_entities(entity_id,relevance),'
        f'cronos_sentiment(score,label)'
        f'&published_at=gte.{cutoff}'
        f'&order=published_at.desc'
        f'&limit=500')

    if len(articles) < 2:
        print(f'  Only {len(articles)} articles found. Need more data.')
        return 0

    print(f'  Loaded {len(articles)} articles')

    entities = query('cronos_entities', 'select=id,type,value,canonical_name&limit=500')
    entity_map = {e['id']: e for e in entities}

    entity_articles = defaultdict(list)
    for art in articles:
        links = art.get('cronos_article_entities') or []
        sents = art.get('cronos_sentiment') or []
        sent_score = sents[0]['score'] if sents else None

        for link in links:
            eid = link['entity_id']
            entity_articles[eid].append({
                'article_id': art['id'],
                'title': art['title'],
                'source': art['source'],
                'published_at': art.get('published_at'),
                'sentiment': sent_score,
                'relevance': link.get('relevance', 0.5),
            })

    correlations = []
    for eid, arts in entity_articles.items():
        sources = set(a['source'] for a in arts)
        if len(sources) < 2:
            continue

        ent = entity_map.get(eid, {})
        entity_value = ent.get('canonical_name') or ent.get('value', '?')
        entity_type = ent.get('type', 'unknown')

        # Calculate consensus
        sentiments = [a['sentiment'] for a in arts if a['sentiment'] is not None]
        avg_sent = sum(sentiments) / len(sentiments) if sentiments else 0

        # Consensus: 1 if all agree on direction, 0 if split
        if sentiments:
            pos = sum(1 for s in sentiments if s > 0.05)
            neg = sum(1 for s in sentiments if s < -0.05)
            total = len(sentiments)
            majority = max(pos, neg, total - pos - neg)
            consensus = majority / total
        else:
            consensus = 0

        # Signal strength
        signal = len(sources) * consensus * abs(avg_sent) if avg_sent else len(sources) * consensus * 0.1

        # Time window
        timestamps = [a['published_at'] for a in arts if a.get('published_at')]
        window_start = min(timestamps) if timestamps else None
        window_end = max(timestamps) if timestamps else None

        # Source details
        source_details = []
        for a in arts:
            source_details.append({
                'source': a['source'],
                'article_id': a['article_id'],
                'title': a['title'][:80],
                'sentiment': a['sentiment'],
                'published_at': a['published_at'],
            })

        correlations.append({
            'entity_id': eid,
            'entity_value': entity_value,
            'entity_type': entity_type,
            'source_count': len(sources),
            'sources': json.dumps(source_details),
            'avg_sentiment': round(avg_sent, 4),
            'sentiment_consensus': round(consensus, 4),
            'signal_strength': round(signal, 4),
            'window_start': window_start,
            'window_end': window_end,
        })

    # Sort by signal strength
    correlations.sort(key=lambda x: x['signal_strength'], reverse=True)

    # Clear stale correlations before inserting fresh batch
    if correlations:
        clear_url = f'{SUPABASE_URL}/rest/v1/cronos_correlations?id=neq.00000000-0000-0000-0000-000000000000'
        clear_req = urllib.request.Request(clear_url, method='DELETE', headers=HEADERS)
        urllib.request.urlopen(clear_req, timeout=10)
        print(f'  Cleared old correlations')

    if correlations:
        print(f'\n[CORRELATOR] Found {len(correlations)} cross-source correlations:')
        for c in correlations[:10]:
            direction = '📈' if c['avg_sentiment'] > 0.05 else '📉' if c['avg_sentiment'] < -0.05 else '➡️'
            print(f'  {direction} {c["entity_value"]} — {c["source_count"]} fontes, '
                  f'consenso {c["sentiment_consensus"]:.0%}, sinal {c["signal_strength"]:.2f}')

        # Insert to DB
        for c in correlations:
            upsert('cronos_correlations', c)
        print(f'  Saved {len(correlations)} correlations')

        # Fire notifications for strong signals (3+ sources or high signal)
        for c in correlations:
            if c['source_count'] >= 3 or c['signal_strength'] > 1.5:
                direction = 'Positivo' if c['avg_sentiment'] > 0 else 'Negativo'
                sev = 'warning' if c['signal_strength'] > 2 else 'info'
                upsert('cronos_notifications', {
                    'type': 'correlation',
                    'title': f'🔗 {c["entity_value"]}: {c["source_count"]} fontes convergem ({direction})',
                    'body': f'Sinal: {c["signal_strength"]:.2f} | Consenso: {c["sentiment_consensus"]:.0%} | Sent: {c["avg_sentiment"]:.3f}',
                    'severity': sev,
                    'ticker': c['entity_value'] if c['entity_type'] == 'ticker' else None,
                })
    else:
        print('  No cross-source correlations found')

    return len(correlations)


if __name__ == '__main__':
    run_correlations()
