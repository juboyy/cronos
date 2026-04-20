"""Pattern matching: identify recurring news→price patterns."""
import json
import math
import sys
import os
import urllib.request
from collections import defaultdict
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY


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
    resp = urllib.request.urlopen(req, timeout=15)
    return resp.status


def _classify_article(title, summary=''):
    """Classify article into pattern type using keyword matching."""
    text = f'{title} {summary or ""}'.lower()
    
    patterns = {
        'dividend': ['dividendo', 'jcp', 'juros sobre capital', 'proventos', 'yield', 'payout'],
        'earnings': ['resultado', 'lucro', 'prejuízo', 'ebitda', 'receita', 'balanço', 'trimestral'],
        'acquisition': ['aquisição', 'fusão', 'compra', 'venda', 'm&a', 'joint venture', 'incorporação'],
        'regulatory': ['regulação', 'aneel', 'anvisa', 'cvm', 'banco central', 'regulatório', 'sanção'],
        'macro': ['selic', 'inflação', 'ipca', 'câmbio', 'dólar', 'pib', 'copom', 'juros'],
        'governance': ['governança', 'ceo', 'presidente', 'conselho', 'assembleia', 'diretor'],
        'operational': ['produção', 'operação', 'plataforma', 'capacidade', 'expansão', 'investimento'],
        'market': ['ipo', 'oferta', 'follow-on', 'recompra', 'buyback', 'desdobramento', 'split'],
    }
    
    for ptype, keywords in patterns.items():
        if any(kw in text for kw in keywords):
            return ptype
    return 'general'


def run_pattern_matching(min_occurrences=3):
    """Identify and persist recurring patterns from impact data."""
    print('[PATTERNS] Analyzing recurring patterns...')
    
    impacts = _query(
        'cronos_impacts',
        'select=ticker,delta_1d,delta_5d,impact_score,volume_anomaly,confidence,'
        'cronos_articles(title,source,published_at,summary)'
        '&impact_score=gt.0&order=created_at.desc&limit=500'
    )
    
    groups = defaultdict(list)
    
    for imp in impacts:
        article = imp.get('cronos_articles')
        if not article:
            continue
        
        ptype = _classify_article(article.get('title', ''), article.get('summary', ''))
        key = (imp['ticker'], ptype)
        groups[key].append({
            'delta_1d': imp.get('delta_1d'),
            'delta_5d': imp.get('delta_5d'),
            'impact_score': imp.get('impact_score', 0),
            'volume_anomaly': imp.get('volume_anomaly', False),
            'title': article.get('title', ''),
            'date': article.get('published_at', ''),
        })
    
    stats = {'patterns': 0, 'skipped': 0}
    
    for (ticker, ptype), entries in groups.items():
        if len(entries) < min_occurrences:
            stats['skipped'] += 1
            continue
        
        deltas = [e['delta_1d'] for e in entries if e['delta_1d'] is not None]
        scores = [e['impact_score'] for e in entries if e['impact_score']]
        
        if not deltas:
            stats['skipped'] += 1
            continue
        
        avg_impact = sum(deltas) / len(deltas)
        std_dev = math.sqrt(sum((d - avg_impact) ** 2 for d in deltas) / len(deltas)) if len(deltas) > 1 else 0
        avg_confidence = sum(scores) / len(scores) if scores else 0
        
        direction = 'alta' if avg_impact > 0 else 'queda'
        desc = f'Notícias de {ptype} → {ticker} {direction} média de {abs(avg_impact):.2f}%'
        
        samples = [
            {'title': e['title'][:100], 'date': e['date'], 'delta': e['delta_1d']}
            for e in sorted(entries, key=lambda x: x['date'] or '', reverse=True)[:3]
        ]
        
        record = {
            'ticker': ticker,
            'pattern_type': ptype,
            'description': desc,
            'avg_impact': round(avg_impact, 4),
            'std_dev': round(std_dev, 4),
            'occurrences': len(entries),
            'avg_confidence': round(avg_confidence, 4),
            'sample_articles': samples,
            'last_seen': entries[0]['date'] if entries[0]['date'] else None,
            'updated_at': datetime.utcnow().isoformat(),
        }
        
        status = _upsert('cronos_patterns', record)
        if status and status < 300:
            stats['patterns'] += 1
            print(f'  {ticker}/{ptype}: {len(entries)} occurrences, avg Δ={avg_impact:.2f}%, σ={std_dev:.2f}%')
        else:
            stats['skipped'] += 1
    
    print(f'\n{"=" * 40}')
    print(f'Pattern Matching Complete!')
    print(f'  Patterns: {stats["patterns"]}')
    print(f'  Skipped:  {stats["skipped"]}')
    return stats


if __name__ == '__main__':
    run_pattern_matching(min_occurrences=2)
