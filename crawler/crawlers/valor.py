"""Valor Econômico RSS crawler."""
import xml.etree.ElementTree as ET
import re
from crawlers.base import BaseCrawler


class ValorCrawler(BaseCrawler):
    name = 'valor'
    url = 'https://pox.globo.com/rss/valor/'

    def fetch(self):
        raw = self._fetch_url(self.url)
        if not raw:
            return []
        return self.parse(raw)

    def parse(self, raw):
        articles = []
        try:
            raw = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;)', '&amp;', raw)
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
