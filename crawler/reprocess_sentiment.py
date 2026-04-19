"""Re-process articles that have keyword-only sentiment with LLM."""
import sys
import os
import json
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY
from nlp.sentiment import analyze_sentiment

def _headers():
    return {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
    }

def get_keyword_articles(limit=100):
    """Fetch articles whose sentiment was scored by keyword fallback."""
    # Get sentiment records with low confidence (keyword = 0.3-0.6)
    url = (f'{SUPABASE_URL}/rest/v1/cronos_sentiment'
           f'?confidence=lte.0.6&select=id,article_id,score,label,confidence'
           f'&order=id.desc&limit={limit}')
    req = urllib.request.Request(url, headers=_headers())
    resp = urllib.request.urlopen(req, timeout=15)
    sentiments = json.loads(resp.read())
    
    if not sentiments:
        print("No keyword-scored articles found.")
        return []
    
    # Get article titles
    article_ids = [s['article_id'] for s in sentiments]
    articles_url = (f'{SUPABASE_URL}/rest/v1/cronos_articles'
                    f'?id=in.({",".join(str(a) for a in article_ids)})'
                    f'&select=id,title,summary')
    req = urllib.request.Request(articles_url, headers=_headers())
    resp = urllib.request.urlopen(req, timeout=15)
    articles = json.loads(resp.read())
    
    article_map = {a['id']: a for a in articles}
    
    results = []
    for s in sentiments:
        article = article_map.get(s['article_id'])
        if article:
            results.append({
                'sentiment_id': s['id'],
                'article_id': s['article_id'],
                'title': article['title'],
                'summary': article.get('summary'),
                'old_score': s['score'],
                'old_confidence': s['confidence'],
            })
    
    return results


def reprocess(limit=50, dry_run=False):
    """Re-score keyword-only sentiments with LLM."""
    articles = get_keyword_articles(limit)
    print(f"Found {len(articles)} keyword-scored articles to reprocess")
    
    upgraded = 0
    errors = 0
    
    for a in articles:
        try:
            result = analyze_sentiment(a['title'], a.get('summary'))
            
            if result.get('model') == 'keyword':
                # Still falling back to keyword — LLM unavailable
                print(f"  [SKIP] LLM still unavailable, stopping reprocess")
                break
            
            if dry_run:
                print(f"  [DRY] {a['title'][:60]}: {a['old_score']:.2f} → {result['score']:.2f} ({result['model']})")
                upgraded += 1
                continue
            
            # Update the sentiment record
            body = json.dumps({
                'score': result['score'],
                'label': result['label'],
                'confidence': result['confidence'],
            }).encode()
            
            url = f"{SUPABASE_URL}/rest/v1/cronos_sentiment?id=eq.{a['sentiment_id']}"
            req = urllib.request.Request(url, data=body, method='PATCH', headers={
                **_headers(),
                'Prefer': 'return=minimal',
            })
            urllib.request.urlopen(req, timeout=10)
            
            upgraded += 1
            delta = result['score'] - a['old_score']
            direction = "↑" if delta > 0 else "↓" if delta < 0 else "→"
            print(f"  ✓ {a['title'][:60]}: {a['old_score']:.2f} → {result['score']:.2f} {direction} ({result['model']})")
            
            time.sleep(1)  # Rate limit
            
        except Exception as e:
            errors += 1
            print(f"  [ERROR] {a['title'][:40]}: {e}")
    
    print(f"\nReprocess complete: {upgraded} upgraded, {errors} errors")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=50)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    reprocess(args.limit, args.dry_run)
