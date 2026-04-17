"""Reuters Brazil news scraper (best-effort, may be blocked)."""
import re
import xml.etree.ElementTree as ET
from crawlers.base import BaseCrawler


class ReutersCrawler(BaseCrawler):
    name = 'reuters'
    url = 'https://www.reuters.com/news/archive/brasilNews'

    def fetch(self):
        # Try RSS feeds first
        rss_urls = [
            'https://www.reuters.com/rssFeed/businessNews',
            'https://news.google.com/rss/search?q=brasil+finanças+mercado&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        ]
        for rss_url in rss_urls:
            raw = self._fetch_url(rss_url)
            if raw and '<item' in raw:
                return self._parse_rss(raw)

        # Fallback: basic HTML
        raw = self._fetch_url(self.url)
        if not raw:
            return []
        return self.parse(raw)

    def _parse_rss(self, raw):
        articles = []
        try:
            raw = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;)', '&amp;', raw)
            root = ET.fromstring(raw)
        except ET.ParseError:
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
                    from email.utils import parsedate_to_datetime
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

    def parse(self, raw):
        # Very basic HTML fallback
        articles = []
        pattern = r'<a[^>]+href="(/business/[^"]+)"[^>]*>([^<]+)</a>'
        for match in re.finditer(pattern, raw):
            url = f'https://www.reuters.com{match.group(1)}'
            title = match.group(2).strip()
            if title and len(title) > 10:
                articles.append({
                    'source': self.name,
                    'url': url,
                    'title': title,
                    'summary': None,
                    'content': None,
                    'published_at': None,
                })
        return articles
