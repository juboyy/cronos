#!/usr/bin/env python3
"""
Alert Evaluator — checks alert conditions and fires notifications.

Runs periodically (via cron.sh). For each active alert:
1. Check conditions against latest data
2. If triggered and cooldown has elapsed, fire notification
3. Update trigger count and last_triggered

Supports: sentiment, volume, price, pattern alert types.
"""
import json
import sys
import os
import urllib.request
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

HEADERS = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
}

TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '5166650114')

def query(table, params=''):
    url = f'{SUPABASE_URL}/rest/v1/{table}?{params}'
    req = urllib.request.Request(url, headers=HEADERS)
    r = urllib.request.urlopen(req, timeout=15)
    return json.loads(r.read())

def update_alert(alert_id, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/cronos_alerts?id=eq.{alert_id}',
        data=body,
        headers={**HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
        method='PATCH',
    )
    urllib.request.urlopen(req, timeout=10)

def send_telegram(message):
    """Send alert via Telegram."""
    if not TELEGRAM_BOT_TOKEN:
        print(f'  [TG] No bot token, skipping: {message[:60]}...')
        return False
    data = json.dumps({'chat_id': TELEGRAM_CHAT_ID, 'text': message, 'parse_mode': 'HTML'}).encode()
    req = urllib.request.Request(
        f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage',
        data=data,
        headers={'Content-Type': 'application/json'},
    )
    urllib.request.urlopen(req, timeout=10)
    return True

def log_trigger(alert_id, alert_name, reason, data):
    """Log alert trigger to cronos_alert_triggers (if table exists) or stdout."""
    print(f'  🔔 TRIGGERED: {alert_name} — {reason}')
    body = json.dumps({
        'alert_id': alert_id,
        'reason': reason,
        'data': json.dumps(data),
    }).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/cronos_alert_triggers',
        data=body,
        headers={**HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
    )
    urllib.request.urlopen(req, timeout=5)

def check_sentiment(conditions, ticker):
    """Check if sentiment is below threshold."""
    threshold = conditions.get('sentiment_below', -0.3)
    recent = query('cronos_sentiment',
        f'select=score,article_id,cronos_articles(title)&cronos_articles.title=ilike.*{ticker}*&order=created_at.desc&limit=5')

    if not recent:
        return None, None

    scores = [s['score'] for s in recent if s.get('score') is not None]
    if not scores:
        return None, None

    avg = sum(scores) / len(scores)
    if avg < threshold:
        return True, {
            'avg_sentiment': round(avg, 4),
            'threshold': threshold,
            'sample_size': len(scores),
            'latest_article': recent[0].get('cronos_articles', {}).get('title', '?') if recent else None,
        }
    return False, None

def check_price(conditions, ticker):
    """Check if price delta exceeds threshold."""
    threshold = conditions.get('delta_above', 3.0)
    prices = query('cronos_prices',
        f'ticker=eq.{ticker}&select=close,date&order=date.desc&limit=2')

    if len(prices) < 2:
        return None, None

    latest = prices[0]['close']
    prev = prices[1]['close']
    delta_pct = ((latest - prev) / prev) * 100

    if abs(delta_pct) > abs(threshold):
        return True, {
            'delta_pct': round(delta_pct, 3),
            'threshold': threshold,
            'latest_price': latest,
            'prev_price': prev,
            'latest_date': prices[0]['date'],
        }
    return False, None

def check_volume(conditions, ticker):
    """Check if news volume spike detected."""
    threshold = conditions.get('volume_above', 5)
    now = datetime.now(timezone.utc)
    day_ago = (now - timedelta(days=1)).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()

    recent = query('cronos_articles',
        f'select=id&title=ilike.*{ticker}*&published_at=gte.{day_ago}&limit=100')
    weekly = query('cronos_articles',
        f'select=id&title=ilike.*{ticker}*&published_at=gte.{week_ago}&limit=500')

    recent_count = len(recent)
    daily_avg = len(weekly) / 7 if weekly else 0

    if daily_avg > 0 and recent_count > threshold and recent_count > daily_avg * 2:
        return True, {
            'recent_24h': recent_count,
            'daily_avg_7d': round(daily_avg, 1),
            'threshold': threshold,
            'spike_ratio': round(recent_count / daily_avg, 1),
        }
    return False, None

def run():
    print('[ALERTS] Evaluating active alerts...')

    alerts = query('cronos_alerts', 'active=eq.true&select=*&order=created_at.asc')
    if not alerts:
        print('  No active alerts.')
        return 0

    print(f'  {len(alerts)} active alerts to check')
    now = datetime.now(timezone.utc)
    triggered_count = 0

    for alert in alerts:
        name = alert.get('name', 'unnamed')
        alert_type = alert.get('type', 'sentiment')
        conditions = alert.get('conditions', {})
        ticker = conditions.get('ticker', '')
        cooldown = alert.get('cooldown_minutes', 60)
        last_triggered = alert.get('last_triggered')

        if last_triggered:
            lt = datetime.fromisoformat(last_triggered.replace('Z', '+00:00'))
            if (now - lt).total_seconds() < cooldown * 60:
                continue

        triggered = False
        trigger_data = None

        if alert_type == 'sentiment' and ticker:
            triggered, trigger_data = check_sentiment(conditions, ticker)
        elif alert_type == 'price' and ticker:
            triggered, trigger_data = check_price(conditions, ticker)
        elif alert_type == 'volume' and ticker:
            triggered, trigger_data = check_volume(conditions, ticker)

        if triggered and trigger_data:
            triggered_count += 1
            reason = f'{alert_type}: {json.dumps(trigger_data, ensure_ascii=False)[:200]}'
            log_trigger(alert['id'], name, reason, trigger_data)

            channels = alert.get('channels', ['dashboard'])

            if 'telegram' in channels:
                msg = f'🔔 <b>Alerta Cronos: {name}</b>\n'
                msg += f'Ticker: <code>{ticker}</code>\n'
                msg += f'Tipo: {alert_type}\n'
                for k, v in trigger_data.items():
                    msg += f'{k}: <code>{v}</code>\n'
                send_telegram(msg)

            update_alert(alert['id'], {
                'last_triggered': now.isoformat(),
                'trigger_count': (alert.get('trigger_count', 0) or 0) + 1,
            })

    print(f'\n[ALERTS] Done — {triggered_count}/{len(alerts)} triggered')
    return triggered_count

if __name__ == '__main__':
    run()
