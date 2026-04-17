"""Pipeline: crawl → extract entities → sentiment → insert into Supabase."""
import time
import sys
import os

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import check_article_exists, insert_article, insert_entity, get_entity_id, link_article_entity, insert_sentiment
from nlp.entity_extractor import extract_entities
from nlp.sentiment import analyze_sentiment
from crawlers.infomoney import InfoMoneyCrawler
from crawlers.valor import ValorCrawler
from crawlers.b3_news import B3Crawler
from crawlers.bcb import BCBCrawler
from crawlers.reuters_br import ReutersCrawler


ALL_CRAWLERS = {
    'infomoney': InfoMoneyCrawler,
    'valor': ValorCrawler,
    'b3': B3Crawler,
    'bcb': BCBCrawler,
    'reuters': ReutersCrawler,
}


def run_pipeline(sources=None, dry_run=False):
    """Run full crawl → NLP → DB pipeline."""
    if sources is None:
        sources = list(ALL_CRAWLERS.keys())

    stats = {'crawled': 0, 'new': 0, 'entities': 0, 'sentiment': 0, 'errors': 0}
    MAX_NEW_PER_SOURCE = 20  # Cap to avoid API rate limits on sentiment

    for source_name in sources:
        crawler_cls = ALL_CRAWLERS.get(source_name)
        if not crawler_cls:
            print(f'[SKIP] Unknown source: {source_name}')
            continue

        print(f'\n[{source_name.upper()}] Crawling...')
        crawler = crawler_cls()

        try:
            articles = crawler.fetch()
        except Exception as e:
            print(f'  [ERROR] {source_name} fetch failed: {e}')
            stats['errors'] += 1
            continue

        print(f'  Found {len(articles)} articles')
        stats['crawled'] += len(articles)
        new_this_source = 0

        for article in articles:
            if new_this_source >= MAX_NEW_PER_SOURCE:
                break
            try:
                # Dedup check
                if not dry_run and check_article_exists(article['url']):
                    continue

                stats['new'] += 1
                new_this_source += 1

                if dry_run:
                    print(f'  [DRY] {article["title"][:80]}')
                    continue

                # Insert article
                article_id = insert_article(article)
                if not article_id:
                    stats['errors'] += 1
                    continue

                # Extract entities
                entities = extract_entities(
                    article['title'],
                    article.get('summary'),
                    article.get('content'),
                )

                for ent in entities:
                    # Insert or get entity
                    entity_data = {
                        'type': ent['type'],
                        'value': ent['value'],
                    }
                    if ent.get('canonical_name'):
                        entity_data['canonical_name'] = ent['canonical_name']
                    if ent.get('sector'):
                        entity_data['sector'] = ent['sector']

                    entity_id = get_entity_id(ent['type'], ent['value'])
                    if not entity_id:
                        entity_id = insert_entity(entity_data)

                    if entity_id:
                        link_article_entity(
                            article_id, entity_id,
                            relevance=ent.get('relevance', 0.5),
                            context=ent.get('context'),
                        )
                        stats['entities'] += 1

                # Sentiment analysis (rate limited)
                sentiment = analyze_sentiment(article['title'], article.get('summary'))
                if sentiment:
                    insert_sentiment(
                        article_id,
                        score=sentiment['score'],
                        label=sentiment['label'],
                        confidence=sentiment['confidence'],
                    )
                    stats['sentiment'] += 1
                    time.sleep(0.5)  # Rate limit Gemini

            except Exception as e:
                print(f'  [ERROR] Processing article: {e}')
                stats['errors'] += 1
                continue

    print(f'\n{"="*50}')
    print(f'Pipeline complete!')
    print(f'  Crawled: {stats["crawled"]} articles')
    print(f'  New:     {stats["new"]}')
    print(f'  Entities: {stats["entities"]} links')
    print(f'  Sentiment: {stats["sentiment"]} analyzed')
    print(f'  Errors:  {stats["errors"]}')

    return stats
