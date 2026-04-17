"""Investing.com Brasil crawler — https://br.investing.com"""
import xml.etree.ElementTree as ET
import re
from email.utils import parsedate_to_datetime
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
                articles.extend(self.parse(raw))
        seen = set()
        unique = []
        for a in articles:
            if a['url'] not in seen:
                seen.add(a['url'])
                unique.append(a)
        return unique[:100]

    def parse(self, raw):
        articles = []
        raw = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;)', '&amp;', raw)
        try:
            root = ET.fromstring(raw)
        except ET.ParseError as e:
            print(f'  [{self.name}] XML parse error: {e}')
            return []

        for item in root.iter('item'):
            title = item.findtext('title', '').strip()
            link = item.findtext('link', '').strip()
            desc = item.findtext('description', '').strip()
            pub_date = item.findtext('pubDate', '')

            if not title or not link:
                continue

            desc = re.sub(r'<[^>]+>', '', desc).strip()

            published_at = None
            if pub_date:
                try:
                    published_at = parsedate_to_datetime(pub_date).isoformat()
                except Exception:
                    pass

            articles.append({
                'source': self.name,
                'url': link,
                'title': title,
                'summary': desc[:1000] if desc else None,
                'content': None,
                'published_at': published_at,
            })

        return articles
