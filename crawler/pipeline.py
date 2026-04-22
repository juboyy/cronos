"""Enhanced pipeline: crawl → NLP → sentiment → impact → patterns → alerts."""
import time
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import check_article_exists, insert_article, insert_entity, get_entity_id, link_article_entity, insert_sentiment
from nlp.entity_extractor import extract_entities
from nlp.sentiment import analyze_sentiment
from crawlers.infomoney import InfoMoneyCrawler
from crawlers.valor import ValorCrawler
from crawlers.b3_news import B3Crawler
from crawlers.bcb import BCBCrawler
from crawlers.reuters_br import ReutersCrawler
from crawlers.estadao import EstadaoCrawler
from crawlers.folha import FolhaCrawler
from crawlers.exame import ExameCrawler
from crawlers.moneytimes import MoneyTimesCrawler
from crawlers.investing_br import InvestingBRCrawler
from crawlers.seudinheiro import SeuDinheiroCrawler
from crawlers.bloomberg_linea import BloombergLineaCrawler
from crawlers.broadcast import BroadcastCrawler
from crawlers.cnn_brasil import CNNBrasilCrawler


ALL_CRAWLERS = {
    'infomoney': InfoMoneyCrawler,
    'valor': ValorCrawler,
    'b3': B3Crawler,
    'bcb': BCBCrawler,
    'reuters': ReutersCrawler,
    'estadao': EstadaoCrawler,
    'folha': FolhaCrawler,
    'exame': ExameCrawler,
    'moneytimes': MoneyTimesCrawler,
    'investing_br': InvestingBRCrawler,
    'seudinheiro': SeuDinheiroCrawler,
    'bloomberg_linea': BloombergLineaCrawler,
    'broadcast': BroadcastCrawler,
    'cnn_brasil': CNNBrasilCrawler,
}


def run_pipeline(sources=None, dry_run=False, run_impact=False, run_patterns=False, run_alerts=False):
    """Run full crawl → NLP → DB pipeline with optional post-processing."""
    if sources is None:
        sources = list(ALL_CRAWLERS.keys())

    stats = {'crawled': 0, 'new': 0, 'entities': 0, 'sentiment': 0, 'errors': 0}
    MAX_NEW_PER_SOURCE = 50

    for source_name in sources:
        crawler_cls = ALL_CRAWLERS.get(source_name)
        if not crawler_cls:
            print(f'[SKIP] Unknown source: {source_name}')
            continue

        print(f'\n[{source_name.upper()}] Crawling...')
        crawler = crawler_cls()

        articles = crawler.fetch()

        print(f'  Found {len(articles)} articles')
        stats['crawled'] += len(articles)
        new_this_source = 0

        for article in articles:
            if new_this_source >= MAX_NEW_PER_SOURCE:
                break
            if not dry_run and check_article_exists(article['url']):
                continue

            stats['new'] += 1
            new_this_source += 1

            if dry_run:
                print(f'  [DRY] {article["title"][:80]}')
                continue

            article_id = insert_article(article)
            if not article_id:
                stats['errors'] += 1
                continue

            entities = extract_entities(
                article['title'],
                article.get('summary'),
                article.get('content'),
            )

            for ent in entities:
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

            sentiment = analyze_sentiment(article['title'], article.get('summary'))
            if sentiment:
                insert_sentiment(
                    article_id,
                    score=sentiment['score'],
                    label=sentiment['label'],
                    confidence=sentiment['confidence'],
                )
                stats['sentiment'] += 1
                time.sleep(0.5)

                if abs(sentiment['score']) > 0.4:
                    from alert_engine import _insert as _notif_insert
                    sev = 'warning' if sentiment['score'] < -0.3 else 'info'
                    direction = '📉 Negativo' if sentiment['score'] < 0 else '📈 Positivo'
                    tickers = [e['value'] for e in entities if e.get('type') == 'ticker']
                    _notif_insert('cronos_notifications', {
                        'type': 'sentiment',
                        'title': f'{direction}: {article["title"][:60]}',
                        'body': f'Score: {sentiment["score"]:.3f} | Fonte: {article.get("source", "?")}',
                        'severity': sev,
                        'ticker': tickers[0] if tickers else None,
                        'article_id': article_id,
                    })

    print(f'\n{"=" * 50}')
    print(f'Pipeline complete!')
    print(f'  Crawled: {stats["crawled"]} articles')
    print(f'  New:     {stats["new"]}')
    print(f'  Entities: {stats["entities"]} links')
    print(f'  Sentiment: {stats["sentiment"]} analyzed')
    print(f'  Errors:  {stats["errors"]}')

    if run_impact:
        print(f'\n--- Impact Scoring ---')
        from nlp.impact_scorer import run_impact_scoring
        run_impact_scoring(limit=100)

    if run_patterns:
        print(f'\n--- Pattern Matching ---')
        from nlp.pattern_matcher import run_pattern_matching
        run_pattern_matching(min_occurrences=2)

    if run_alerts:
        print(f'\n--- Alert Engine ---')
        from alert_engine import run_alert_engine
        run_alert_engine()

    if run_impact or run_patterns:
        print(f'\n--- Cross-Source Correlator ---')
        from nlp.correlator import run_correlations
        run_correlations()

        print(f'\n--- Temporal Clusters ---')
        from nlp.cluster_detector import run_clustering
        run_clustering()

        print(f'\n--- Daily Briefing ---')
        from nlp.briefing_generator import run_briefing
        run_briefing()

    return stats
