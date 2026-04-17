"""CNN Brasil Economia crawler — https://www.cnnbrasil.com.br"""
import xml.etree.ElementTree as ET
import re
from email.utils import parsedate_to_datetime
from crawlers.base import BaseCrawler


class CNNBrasilCrawler(BaseCrawler):
    name = 'cnn_brasil'
    url = 'https://www.cnnbrasil.com.br/tudo-sobre/economia/feed/'

    def fetch(self):
        raw = self._fetch_url(self.url)
        if not raw:
            return []
        return self.parse(raw)

    def parse(self, raw):
        articles = []
        raw = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;|#)', '&amp;', raw)
        # Remove CDATA sections that might cause issues
        raw = re.sub(r'<!\[CDATA\[', '', raw)
        raw = re.sub(r'\]\]>', '', raw)
        # Remove control chars
        raw = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', raw)
        try:
            root = ET.fromstring(raw)
        except ET.ParseError:
            # Fallback: regex extraction
            return self._parse_regex(raw)

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

    def _parse_regex(self, raw):
        """Fallback regex parser for malformed XML."""
        articles = []
        items = re.findall(r'<item>(.*?)</item>', raw, re.DOTALL)
        for item in items:
            title_m = re.search(r'<title>(.*?)</title>', item, re.DOTALL)
            link_m = re.search(r'<link>(.*?)</link>', item, re.DOTALL)
            desc_m = re.search(r'<description>(.*?)</description>', item, re.DOTALL)
            pub_m = re.search(r'<pubDate>(.*?)</pubDate>', item, re.DOTALL)

            title = re.sub(r'<[^>]+>', '', title_m.group(1)).strip() if title_m else ''
            link = link_m.group(1).strip() if link_m else ''
            desc = re.sub(r'<[^>]+>', '', desc_m.group(1)).strip() if desc_m else ''
            pub_date = pub_m.group(1).strip() if pub_m else ''

            if not title or not link:
                continue

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
