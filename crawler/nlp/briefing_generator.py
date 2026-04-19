#!/usr/bin/env python3
"""
Daily Briefing Generator — produces automated intelligence summaries.

Runs once daily. Aggregates:
- Top mentioned entities
- Strongest cross-source correlations
- Active clusters
- Overall market mood
- Source distribution
"""
import json
import sys
import os
import urllib.request
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY

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
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}?on_conflict=date',
        data=body,
        headers={**HEADERS, 'Content-Type': 'application/json',
                 'Prefer': 'resolution=merge-duplicates,return=minimal'},
        method='POST',
    )
    try:
        urllib.request.urlopen(req, timeout=15)
        return True
    except urllib.error.HTTPError as e:
        print(f'  Upsert error: {e.code} — {e.read().decode()[:200]}')
        return False


def _generate_summary(data):
    """Use Gemini Flash to generate a natural-language briefing."""
    if not GEMINI_API_KEY:
        return _fallback_summary(data)

    prompt = f"""Gere um briefing executivo de inteligência financeira em PT-BR.
Dados do dia:
- {data['article_count']} artigos analisados de {len(data['source_breakdown'])} fontes
- Humor de mercado: {data['market_mood']:.3f} (-1=bearish, +1=bullish)
- Top entidades: {json.dumps(data['top_entities'][:5], ensure_ascii=False)}
- Correlações cross-source: {json.dumps(data['top_correlations'][:3], ensure_ascii=False)}
- Clusters ativos: {json.dumps(data['top_clusters'][:3], ensure_ascii=False)}
- Alertas disparados: {data['alerts_fired']}

Formato: 3-5 parágrafos curtos, direto ao ponto. Sem introdução genérica.
Foque em: sinais mais fortes, convergências entre fontes, riscos emergentes.
Tom: analista sênior, objetivo, sem jargão desnecessário."""

    try:
        url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}'
        body = json.dumps({
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {'maxOutputTokens': 600, 'temperature': 0.3},
        }).encode()
        req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read())
        text = result['candidates'][0]['content']['parts'][0]['text']
        return text.strip()
    except Exception as e:
        print(f'  Gemini failed: {e}')
        return _fallback_summary(data)


def _fallback_summary(data):
    """Generate a simple template-based summary."""
    mood = 'otimista' if data['market_mood'] > 0.05 else 'pessimista' if data['market_mood'] < -0.05 else 'neutro'
    top_ents = ', '.join(e['entity'] for e in data['top_entities'][:3]) or 'nenhuma'

    parts = [
        f"**Cronos Briefing — {data['date']}**",
        f"{data['article_count']} artigos processados. Humor geral: {mood} ({data['market_mood']:.3f}).",
    ]

    if data['top_entities']:
        parts.append(f"Entidades mais mencionadas: {top_ents}.")

    if data['top_correlations']:
        c = data['top_correlations'][0]
        parts.append(f"Correlação mais forte: {c['entity']} ({c['sources']} fontes, sinal {c['signal_strength']:.2f}).")

    if data['top_clusters']:
        cl = data['top_clusters'][0]
        parts.append(f"Cluster ativo: {cl['title']} ({cl['article_count']} artigos).")

    if data['alerts_fired']:
        parts.append(f"{data['alerts_fired']} alertas disparados.")

    return '\n\n'.join(parts)


def run_briefing(target_date=None):
    """Generate daily briefing for the given date (default: today)."""
    if target_date is None:
        target_date = datetime.utcnow().strftime('%Y-%m-%d')

    day_start = f'{target_date}T00:00:00'
    day_end = f'{target_date}T23:59:59'

    print(f'[BRIEFING] Generating for {target_date}...')

    # 1. Article count + source breakdown
    articles = query('cronos_articles',
        f'select=source,published_at&published_at=gte.{day_start}&published_at=lte.{day_end}&limit=1000')
    source_breakdown = {}
    for a in articles:
        s = a['source']
        source_breakdown[s] = source_breakdown.get(s, 0) + 1

    if not articles:
        print(f'  No articles for {target_date}')
        return None

    print(f'  {len(articles)} articles from {len(source_breakdown)} sources')

    # 2. Sentiments → market mood
    sentiments = query('cronos_sentiment',
        f'select=score,article_id,cronos_articles!inner(published_at)'
        f'&cronos_articles.published_at=gte.{day_start}'
        f'&cronos_articles.published_at=lte.{day_end}'
        f'&limit=1000')
    scores = [s['score'] for s in sentiments if s.get('score') is not None]
    market_mood = sum(scores) / len(scores) if scores else 0

    # 3. Top entities (most mentioned)
    links = query('cronos_article_entities',
        f'select=entity_id,cronos_articles!inner(published_at)'
        f'&cronos_articles.published_at=gte.{day_start}'
        f'&cronos_articles.published_at=lte.{day_end}'
        f'&limit=1000')

    entity_counts = {}
    for l in links:
        eid = l['entity_id']
        entity_counts[eid] = entity_counts.get(eid, 0) + 1

    entities_all = query('cronos_entities', 'select=id,type,value,canonical_name&limit=500')
    entity_map = {e['id']: e for e in entities_all}

    top_entities = []
    for eid, count in sorted(entity_counts.items(), key=lambda x: -x[1])[:10]:
        ent = entity_map.get(eid, {})
        top_entities.append({
            'entity': ent.get('canonical_name') or ent.get('value', '?'),
            'type': ent.get('type', '?'),
            'mentions': count,
        })

    # 4. Top correlations (today)
    correlations = query('cronos_correlations',
        f'select=entity_value,source_count,signal_strength,avg_sentiment,sentiment_consensus'
        f'&created_at=gte.{day_start}&order=signal_strength.desc&limit=5')
    top_correlations = [{
        'entity': c['entity_value'],
        'sources': c['source_count'],
        'signal_strength': c['signal_strength'],
        'sentiment': c['avg_sentiment'],
        'consensus': c['sentiment_consensus'],
    } for c in correlations]

    # 5. Active clusters
    clusters = query('cronos_clusters',
        f'select=title,article_count,dominant_sentiment,cluster_type'
        f'&created_at=gte.{day_start}&order=article_count.desc&limit=5')
    top_clusters = [{
        'title': c['title'],
        'article_count': c['article_count'],
        'sentiment': c['dominant_sentiment'],
        'type': c['cluster_type'],
    } for c in clusters]

    # 6. Alerts fired
    notifications = query('cronos_notifications',
        f'select=id&created_at=gte.{day_start}&created_at=lte.{day_end}&limit=1000')
    alerts_fired = len(notifications)

    # Assemble data
    briefing_data = {
        'date': target_date,
        'article_count': len(articles),
        'source_breakdown': source_breakdown,
        'market_mood': market_mood,
        'top_entities': top_entities,
        'top_correlations': top_correlations,
        'top_clusters': top_clusters,
        'alerts_fired': alerts_fired,
    }

    # Generate summary
    summary = _generate_summary(briefing_data)
    print(f'\n{summary[:200]}...\n')

    # Save
    briefing_record = {
        'date': target_date,
        'summary': summary,
        'top_entities': json.dumps(top_entities),
        'top_correlations': json.dumps(top_correlations),
        'top_clusters': json.dumps(top_clusters),
        'market_mood': round(market_mood, 4),
        'article_count': len(articles),
        'source_breakdown': json.dumps(source_breakdown),
        'alerts_fired': alerts_fired,
    }

    upsert('cronos_briefings', briefing_record)
    print(f'[BRIEFING] Saved for {target_date}')

    return briefing_data


if __name__ == '__main__':
    import sys as _sys
    date_arg = _sys.argv[1] if len(_sys.argv) > 1 else None
    run_briefing(date_arg)
