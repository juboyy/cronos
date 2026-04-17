"""Impact scoring: correlate news articles with price movements."""
import json
import math
import sys
import os
import urllib.request
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY


def _headers(extra=None):
    h = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
    }
    if extra:
        h.update(extra)
    return h


def _query(table, params=''):
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}?{params}',
        headers=_headers(),
    )
    resp = urllib.request.urlopen(req, timeout=15)
    return json.loads(resp.read())


def _upsert(table, data):
    body = json.dumps(data if isinstance(data, list) else [data]).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}',
        data=body,
        headers=_headers({'Prefer': 'resolution=merge-duplicates,return=minimal'}),
    )
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return resp.status
    except urllib.error.HTTPError as e:
        print(f'  Impact upsert error: {e.code} — {e.read().decode()[:200]}')
        return e.code


def get_price_at(ticker, target_date):
    """Get closest price for ticker on/near a date."""
    dt_str = target_date.strftime('%Y-%m-%d')
    # Search ±3 days to handle weekends/holidays
    dt_start = (target_date - timedelta(days=3)).strftime('%Y-%m-%d')
    dt_end = (target_date + timedelta(days=3)).strftime('%Y-%m-%d')
    
    results = _query(
        'cronos_prices',
        f'ticker=eq.{ticker}&date=gte.{dt_start}&date=lte.{dt_end}'
        f'&order=date.asc&limit=5&select=date,close,volume'
    )
    
    if not results:
        return None
    
    # Find closest date
    best = min(results, key=lambda r: abs(
        (datetime.strptime(r['date'], '%Y-%m-%d') - target_date).days
    ))
    return best


def get_avg_volume(ticker, days=30):
    """Get average daily volume for a ticker over N days."""
    end = datetime.now().strftime('%Y-%m-%d')
    start = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    
    results = _query(
        'cronos_prices',
        f'ticker=eq.{ticker}&date=gte.{start}&date=lte.{end}'
        f'&select=volume&volume=not.is.null'
    )
    
    if not results:
        return 0
    
    volumes = [r['volume'] for r in results if r['volume'] and r['volume'] > 0]
    return sum(volumes) / len(volumes) if volumes else 0


def compute_impact(article, ticker, sentiment_score=0):
    """Compute impact score for an article-ticker pair.
    
    Returns dict with deltas, volume anomaly, and composite score.
    """
    pub_date = article.get('published_at')
    if not pub_date:
        return None
    
    try:
        if 'T' in pub_date:
            pub_dt = datetime.fromisoformat(pub_date.replace('Z', '+00:00').replace('+00:00', ''))
        else:
            pub_dt = datetime.strptime(pub_date[:10], '%Y-%m-%d')
    except (ValueError, TypeError):
        return None
    
    # Get prices at different windows
    t0 = get_price_at(ticker, pub_dt)
    t1d = get_price_at(ticker, pub_dt + timedelta(days=1))
    t5d = get_price_at(ticker, pub_dt + timedelta(days=5))
    
    if not t0 or not t0.get('close'):
        return None
    
    base_price = float(t0['close'])
    if base_price == 0:
        return None
    
    # Calculate deltas
    delta_1d = None
    delta_5d = None
    
    if t1d and t1d.get('close'):
        delta_1d = ((float(t1d['close']) - base_price) / base_price) * 100
    
    if t5d and t5d.get('close'):
        delta_5d = ((float(t5d['close']) - base_price) / base_price) * 100
    
    # Volume anomaly check
    avg_vol = get_avg_volume(ticker)
    current_vol = t0.get('volume', 0) or 0
    volume_ratio = current_vol / avg_vol if avg_vol > 0 else 1.0
    volume_anomaly = volume_ratio > 2.0  # > 2 standard deviations
    
    # Source trust factor
    source_trust = {
        'reuters': 0.9, 'valor': 0.85, 'infomoney': 0.8,
        'bcb': 0.95, 'b3': 0.85,
    }.get(article.get('source', ''), 0.5)
    
    # Composite impact score (0 to 1)
    # Weighted: price delta (40%) + volume (20%) + sentiment magnitude (20%) + source trust (20%)
    delta_factor = 0
    if delta_1d is not None:
        delta_factor = min(abs(delta_1d) / 10.0, 1.0)  # 10% move = max score
    
    volume_factor = min(volume_ratio / 4.0, 1.0) if volume_ratio > 1 else 0
    sentiment_factor = abs(sentiment_score) if sentiment_score else 0
    
    impact_score = (
        0.4 * delta_factor +
        0.2 * volume_factor +
        0.2 * sentiment_factor +
        0.2 * source_trust
    )
    
    # Confidence based on data completeness
    confidence = 0.5
    if delta_1d is not None:
        confidence += 0.2
    if delta_5d is not None:
        confidence += 0.15
    if volume_anomaly:
        confidence += 0.1
    if sentiment_score:
        confidence += 0.05
    
    return {
        'ticker': ticker,
        'delta_1d': round(delta_1d, 4) if delta_1d else None,
        'delta_5d': round(delta_5d, 4) if delta_5d else None,
        'volume_ratio': round(volume_ratio, 2),
        'volume_anomaly': volume_anomaly,
        'impact_score': round(min(impact_score, 1.0), 4),
        'confidence': round(min(confidence, 1.0), 2),
        'sentiment_score': sentiment_score,
        'source_trust': source_trust,
        'window_data': {
            't0': {'date': t0['date'], 'close': float(t0['close']), 'volume': current_vol},
            't1d': {'date': t1d['date'], 'close': float(t1d['close'])} if t1d else None,
            't5d': {'date': t5d['date'], 'close': float(t5d['close'])} if t5d else None,
        },
    }


def run_impact_scoring(limit=100):
    """Score impact for all unscored article-entity pairs."""
    print('[IMPACT] Finding unscored article-ticker pairs...')
    
    # Get articles with linked ticker entities that don't have impact scores yet
    articles_with_entities = _query(
        'cronos_article_entities',
        f'select=article_id,entity_id,cronos_entities(type,value),cronos_articles(title,source,published_at),cronos_sentiment(score)'
        f'&cronos_entities.type=eq.ticker&limit={limit}'
    )
    
    stats = {'scored': 0, 'skipped': 0, 'errors': 0}
    
    for ae in articles_with_entities:
        entity = ae.get('cronos_entities')
        article = ae.get('cronos_articles')
        if not entity or not article:
            stats['skipped'] += 1
            continue
        
        ticker = entity.get('value')
        if not ticker:
            stats['skipped'] += 1
            continue
        
        # Get sentiment if available
        sentiment = ae.get('cronos_sentiment')
        sent_score = sentiment[0]['score'] if sentiment and len(sentiment) > 0 else 0
        
        # Check if already scored
        existing = _query(
            'cronos_impacts',
            f'article_id=eq.{ae["article_id"]}&ticker=eq.{ticker}&select=id&limit=1'
        )
        if existing:
            stats['skipped'] += 1
            continue
        
        try:
            impact = compute_impact(article, ticker, sent_score)
            if impact:
                record = {
                    'article_id': ae['article_id'],
                    'entity_id': ae['entity_id'],
                    **impact,
                }
                status = _upsert('cronos_impacts', record)
                if status and status < 300:
                    stats['scored'] += 1
                    print(f'  {ticker} | Δ1d={impact["delta_1d"]}% | score={impact["impact_score"]} | vol_anom={impact["volume_anomaly"]}')
                else:
                    stats['errors'] += 1
            else:
                stats['skipped'] += 1
        except Exception as e:
            print(f'  [ERROR] {ticker}: {e}')
            stats['errors'] += 1
    
    print(f'\n{"=" * 40}')
    print(f'Impact Scoring Complete!')
    print(f'  Scored:  {stats["scored"]}')
    print(f'  Skipped: {stats["skipped"]}')
    print(f'  Errors:  {stats["errors"]}')
    return stats


if __name__ == '__main__':
    run_impact_scoring()
