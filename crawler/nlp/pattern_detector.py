#!/usr/bin/env python3
"""
Pattern Detector — finds recurring news→price correlations.

Detects patterns like:
- "Negative PETR4 sentiment consistently precedes -2% drops"
- "BCB rate decisions always move ITUB4 within 24h"
- "Exame articles about Vale have 80% accuracy on direction"

Writes results to cronos_patterns table.
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

def upsert(table, data):
    body = json.dumps(data if isinstance(data, list) else [data]).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}?on_conflict=ticker,pattern_type',
        data=body,
        headers={**HEADERS, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal'},
    )
    urllib.request.urlopen(req, timeout=15)

def run():
    print('[PATTERNS] Loading impacts with articles...')
    impacts = query('cronos_impacts',
        'select=*,cronos_articles(title,source,published_at)&delta_1d=not.is.null&order=created_at.desc&limit=500')

    if len(impacts) < 5:
        print(f'  Only {len(impacts)} impacts with deltas. Need more data.')
        return

    print(f'  Loaded {len(impacts)} impacts with price deltas')

    # Group by ticker
    by_ticker = defaultdict(list)
    for imp in impacts:
        by_ticker[imp['ticker']].append(imp)

    patterns = []

    for ticker, imps in by_ticker.items():
        if len(imps) < 3:
            continue

        # ── Pattern 1: Sentiment → Direction accuracy ──
        correct = 0
        total = 0
        for imp in imps:
            sent = imp.get('sentiment_score')
            delta = imp.get('delta_1d')
            if sent is not None and delta is not None:
                total += 1
                # Positive sentiment → positive delta, or negative → negative
                if (sent > 0 and delta > 0) or (sent < 0 and delta < 0):
                    correct += 1

        if total >= 3:
            accuracy = correct / total
            avg_delta = sum(abs(imp.get('delta_1d', 0)) for imp in imps if imp.get('delta_1d')) / len(imps)
            patterns.append({
                'ticker': ticker,
                'pattern_type': 'sentiment_direction',
                'description': f'Sentimento prevê direção do preço com {accuracy:.0%} de acerto ({correct}/{total} casos)',
                'avg_confidence': round(accuracy, 4),
                'avg_impact': round(avg_delta, 4),
                'occurrences': total,
                'last_seen': datetime.utcnow().isoformat(),
            })
            print(f'  {ticker} sentiment→direction: {accuracy:.0%} ({correct}/{total})')

        # ── Pattern 2: Source reliability ──
        by_source = defaultdict(list)
        for imp in imps:
            src = imp.get('cronos_articles', {}).get('source', 'unknown')
            by_source[src].append(imp)

        for src, src_imps in by_source.items():
            if len(src_imps) < 2:
                continue
            avg_impact = sum(imp.get('impact_score', 0) for imp in src_imps) / len(src_imps)
            avg_delta = sum(abs(imp.get('delta_1d', 0)) for imp in src_imps if imp.get('delta_1d')) / len(src_imps)

            if avg_impact > 0.3:
                patterns.append({
                    'ticker': ticker,
                    'pattern_type': f'source_signal_{src}',
                    'description': f'Artigos de {src} sobre {ticker} têm impacto médio de {avg_impact:.3f} e delta médio de {avg_delta:.2f}%',
                    'avg_confidence': round(min(avg_impact, 1.0), 4),
                    'avg_impact': round(avg_delta, 4),
                    'occurrences': len(src_imps),
                    'last_seen': datetime.utcnow().isoformat(),
                })

        # ── Pattern 3: High-impact threshold ──
        high_impacts = [imp for imp in imps if abs(imp.get('delta_1d', 0)) > 2.0]
        if len(high_impacts) >= 2:
            neg_count = sum(1 for imp in high_impacts if imp.get('delta_1d', 0) < 0)
            avg_sent = sum(imp.get('sentiment_score', 0) for imp in high_impacts) / len(high_impacts)
            patterns.append({
                'ticker': ticker,
                'pattern_type': 'volatility_cluster',
                'description': f'{len(high_impacts)} eventos de alta volatilidade (>2% delta). {neg_count} negativos. Sentimento médio: {avg_sent:.3f}',
                'avg_confidence': round(len(high_impacts) / len(imps), 4),
                'avg_impact': round(sum(abs(imp.get('delta_1d', 0)) for imp in high_impacts) / len(high_impacts), 4),
                'occurrences': len(high_impacts),
                'last_seen': datetime.utcnow().isoformat(),
            })

    if patterns:
        print(f'\n[PATTERNS] Saving {len(patterns)} patterns...')
        for p in patterns:
            upsert('cronos_patterns', p)
        print(f'  Done — {len(patterns)} patterns upserted')
    else:
        print('  No patterns detected (need more impact data)')

    return len(patterns)

if __name__ == '__main__':
    run()
