"""Investing.com Brasil crawler — https://br.investing.com"""
from crawlers.base import BaseCrawler


class InvestingBRCrawler(BaseCrawler):
    name = 'investing_br'
    FEED_URLS = [
        'https://br.investing.com/rss/news.rss',
        'https://br.investing.com/rss/news_14.rss',
        'https://br.investing.com/rss/news_25.rss',
    ]

    def fetch(self):
        articles = []
        for feed_url in self.FEED_URLS:
            raw = self._fetch_url(feed_url)
            if raw:
                articles.extend(self._parse_rss(raw))
        seen = set()
        unique = []
        for a in articles:
            if a['url'] not in seen:
                seen.add(a['url'])
                unique.append(a)
        return unique[:100]
