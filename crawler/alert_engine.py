"""Alert engine: evaluate conditions and trigger alerts."""
import json
import sys
import os
import urllib.request
import urllib.error
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
        f'{SUPABASE_URL}/rest/v1/{table}?{params}', headers=_headers())
    resp = urllib.request.urlopen(req, timeout=15)
    return json.loads(resp.read())


def _insert(table, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}', data=body,
        headers=_headers({'Prefer': 'return=minimal'}))
    try:
        urllib.request.urlopen(req, timeout=10)
        return True
    except urllib.error.HTTPError:
        return False


def _update(table, id, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}?id=eq.{id}',
        data=body, method='PATCH',
        headers=_headers({'Prefer': 'return=minimal'}))
    try:
        urllib.request.urlopen(req, timeout=10)
        return True
    except:
        return False


def check_sentiment_condition(conditions):
    """Check if sentiment for a ticker is below threshold."""
    ticker = conditions.get('ticker')
    threshold = conditions.get('sentiment_below', -0.3)
    if not ticker:
        return False, {}

    articles = _query(
        'cronos_article_entities',
        f'select=cronos_sentiment(score)&cronos_entities.value=eq.{ticker}'
        f'&cronos_entities.type=eq.ticker&limit=10'
    )
    
    scores = []
    for a in articles:
        sent = a.get('cronos_sentiment')
        if sent and len(sent) > 0:
            scores.append(sent[0]['score'])
    
    if not scores:
        return False, {}
    
    avg = sum(scores) / len(scores)
    triggered = avg < threshold
    return triggered, {'avg_sentiment': round(avg, 3), 'threshold': threshold, 'sample_size': len(scores)}


def check_volume_condition(conditions):
    """Check if volume is above threshold multiplier."""
    ticker = conditions.get('ticker')
    threshold = conditions.get('volume_above', 2.0)
    if not ticker:
        return False, {}
    
    prices = _query(
        'cronos_prices',
        f'ticker=eq.{ticker}&order=date.desc&limit=30&select=date,volume'
    )
    
    if len(prices) < 5:
        return False, {}
    
    volumes = [p['volume'] for p in prices if p['volume'] and p['volume'] > 0]
    if not volumes:
        return False, {}
    
    avg = sum(volumes[1:]) / len(volumes[1:])
    current = volumes[0]
    ratio = current / avg if avg > 0 else 0
    
    triggered = ratio > threshold
    return triggered, {'volume_ratio': round(ratio, 2), 'current': current, 'avg': round(avg, 0)}


def check_price_condition(conditions):
    """Check if price delta exceeds threshold."""
    ticker = conditions.get('ticker')
    threshold = conditions.get('delta_above', 3.0)
    if not ticker:
        return False, {}
    
    prices = _query(
        'cronos_prices',
        f'ticker=eq.{ticker}&order=date.desc&limit=2&select=date,close'
    )
    
    if len(prices) < 2:
        return False, {}
    
    delta = ((prices[0]['close'] - prices[1]['close']) / prices[1]['close']) * 100
    triggered = abs(delta) > abs(threshold)
    return triggered, {'delta': round(delta, 2), 'threshold': threshold}


CONDITION_CHECKERS = {
    'sentiment': check_sentiment_condition,
    'volume': check_volume_condition,
    'price': check_price_condition,
}


def run_alert_engine():
    """Evaluate all active alerts and trigger as needed."""
    print('[ALERTS] Evaluating active alerts...')
    
    alerts = _query('cronos_alerts', 'active=eq.true&select=*')
    stats = {'checked': 0, 'triggered': 0, 'cooldown': 0}
    
    now = datetime.utcnow()
    
    for alert in alerts:
        stats['checked'] += 1
        
        # Check cooldown
        if alert.get('last_triggered'):
            last = datetime.fromisoformat(alert['last_triggered'].replace('Z', ''))
            cooldown = timedelta(minutes=alert.get('cooldown_minutes', 60))
            if now - last < cooldown:
                stats['cooldown'] += 1
                continue
        
        # Evaluate conditions
        checker = CONDITION_CHECKERS.get(alert['type'])
        if not checker:
            continue
        
        triggered, data = checker(alert['conditions'])
        
        if triggered:
            stats['triggered'] += 1
            print(f'  🔔 TRIGGERED: {alert["name"]} — {json.dumps(data)}')
            
            # Create event
            _insert('cronos_alert_events', {
                'alert_id': alert['id'],
                'conditions_met': data,
                'data_snapshot': alert['conditions'],
                'delivered_to': alert.get('channels', ['dashboard']),
            })
            
            # Update alert
            _update('cronos_alerts', alert['id'], {
                'last_triggered': now.isoformat(),
                'trigger_count': (alert.get('trigger_count', 0) or 0) + 1,
            })
        else:
            print(f'  ✓ OK: {alert["name"]}')
    
    print(f'\n{"=" * 40}')
    print(f'Alert Engine Complete!')
    print(f'  Checked:   {stats["checked"]}')
    print(f'  Triggered: {stats["triggered"]}')
    print(f'  Cooldown:  {stats["cooldown"]}')
    return stats


if __name__ == '__main__':
    run_alert_engine()
