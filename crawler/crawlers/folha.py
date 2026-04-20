"""Folha de São Paulo Mercado RSS crawler."""
import xml.etree.ElementTree as ET
import re
from email.utils import parsedate_to_datetime
from crawlers.base import BaseCrawler


class FolhaCrawler(BaseCrawler):
    name = 'folha'
    url = 'https://feeds.folha.uol.com.br/mercado/rss091.xml'

    def fetch(self):
        raw = self._fetch_with_fallback(self.url)
        if not raw:
            return []
        return self.parse(raw)

    def parse(self, raw):
        articles = []
        root = ET.fromstring(raw)

        ns = {'content': 'http://purl.org/rss/1.0/modules/content/'}

        for item in root.iter('item'):
            title = item.findtext('title', '').strip()
            link = item.findtext('link', '').strip()
            pub_date = item.findtext('pubDate', '')

            if not title or not link:
                continue

            desc = item.find('content:encoded', ns)
            if desc is not None and desc.text:
                summary = re.sub(r'<[^>]+>', '', desc.text).strip()
            else:
                summary = item.findtext('description', '').strip()
                summary = re.sub(r'<[^>]+>', '', summary).strip()

            published_at = None
            if pub_date:
                published_at = parsedate_to_datetime(pub_date).isoformat()

            articles.append({
                'source': self.name,
                'url': link,
                'title': title,
                'summary': summary[:1000] if summary else None,
                'content': None,
                'published_at': published_at,
            })

        return articles
