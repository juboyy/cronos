"""Supabase REST client for Cronos."""
import json
import urllib.request
import urllib.error
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


def _post(table, data, prefer='return=minimal'):
    body = json.dumps(data if isinstance(data, list) else [data]).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}',
        data=body,
        headers=_headers({'Prefer': prefer}),
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return resp.status
    except urllib.error.HTTPError as e:
        err = e.read().decode()[:200]
        print(f'  DB error ({table}): {e.code} — {err}')
        return e.code


def check_article_exists(url):
    """Check if article URL already in DB."""
    encoded = urllib.parse.quote(url, safe='')
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/cronos_articles?url=eq.{encoded}&select=id&limit=1',
        headers=_headers(),
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        return len(data) > 0
    except Exception:
        return False


def insert_article(article):
    """Insert article, return id or None."""
    body = json.dumps(article).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/cronos_articles',
        data=body,
        headers=_headers({'Prefer': 'resolution=merge-duplicates,return=representation'}),
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        result = json.loads(resp.read())
        return result[0]['id'] if result else None
    except urllib.error.HTTPError as e:
        err = e.read().decode()[:200]
        print(f'  Insert article error: {e.code} — {err}')
        return None


def insert_entity(entity):
    """Insert entity (upsert), return id."""
    body = json.dumps(entity).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/cronos_entities',
        data=body,
        headers=_headers({'Prefer': 'resolution=merge-duplicates,return=representation'}),
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        result = json.loads(resp.read())
        return result[0]['id'] if result else None
    except urllib.error.HTTPError as e:
        err = e.read().decode()[:200]
        print(f'  Insert entity error: {e.code} — {err}')
        return None


def get_entity_id(entity_type, value):
    """Get entity id by type+value."""
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/cronos_entities?type=eq.{entity_type}&value=eq.{urllib.parse.quote(value)}&select=id&limit=1',
        headers=_headers(),
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        return data[0]['id'] if data else None
    except Exception:
        return None


def link_article_entity(article_id, entity_id, relevance=0.5, context=None):
    """Link article to entity."""
    data = {
        'article_id': article_id,
        'entity_id': entity_id,
        'relevance': relevance,
    }
    if context:
        data['context'] = context[:500]
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/cronos_article_entities',
        data=body,
        headers=_headers({'Prefer': 'resolution=merge-duplicates,return=minimal'}),
    )
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception:
        pass


def insert_sentiment(article_id, score, label, confidence=0.5, model='gemini-flash'):
    """Insert sentiment for article."""
    data = {
        'article_id': article_id,
        'score': score,
        'label': label,
        'confidence': confidence,
        'model': model,
    }
    _post('cronos_sentiment', data)


import urllib.parse
