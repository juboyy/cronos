"""Estadão Economia RSS crawler."""
import xml.etree.ElementTree as ET
import re
from email.utils import parsedate_to_datetime
from crawlers.base import BaseCrawler

# Only keep articles from financial/economic sections
ALLOWED_PATHS = {
    '/economia/', '/mercado/', '/negocios/', '/financas/',
    '/business/', '/investimentos/',
}
BLOCKED_PATHS = {
    '/esportes/', '/futebol/', '/emais/', '/cultura/',
    '/politica/', '/cidades/', '/saude/', '/paladar/',
    '/link/', '/viagem/', '/educacao/',
}


class EstadaoCrawler(BaseCrawler):
    name = 'estadao'
    url = 'https://www.estadao.com.br/arc/outboundfeeds/rss/?outputType=xml'

    def fetch(self):
        raw = self._fetch_with_fallback(self.url)
        if not raw:
            return []
        return self.parse(raw)

    def parse(self, raw):
        articles = []
        try:
            root = ET.fromstring(raw)
        except ET.ParseError:
            raw = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;)', '&amp;', raw)
            try:
                root = ET.fromstring(raw)
            except ET.ParseError as e:
                print(f'  [{self.name}] XML parse error: {e}')
                return []

        ns = {'content': 'http://purl.org/rss/1.0/modules/content/'}

        for item in root.iter('item'):
            title = item.findtext('title', '').strip()
            link = item.findtext('link', '').strip()
            pub_date = item.findtext('pubDate', '')

            if not title or not link:
                continue

            # Filter: only financial/economic content
            link_lower = link.lower()
            if any(bp in link_lower for bp in BLOCKED_PATHS):
                continue
            # If it's not in a known financial section AND doesn't contain financial keywords, skip
            if not any(ap in link_lower for ap in ALLOWED_PATHS):
                fin_keywords = {'ibovespa', 'bolsa', 'a\u00e7\u00f5es', 'selic', 'infla\u00e7\u00e3o', 'pib',
                                'cdi', 'd\u00f3lar', 'juros', 'fii', 'b3', 'petrobras', 'vale',
                                'ipo', 'dividendos', 'mercado financeiro', 'banco central'}
                title_lower = title.lower()
                if not any(kw in title_lower for kw in fin_keywords):
                    continue

            # Try content:encoded first, fall back to description
            desc = item.find('content:encoded', ns)
            if desc is not None and desc.text:
                summary = re.sub(r'<[^>]+>', '', desc.text).strip()
            else:
                summary = item.findtext('description', '').strip()
                summary = re.sub(r'<[^>]+>', '', summary).strip()

            published_at = None
            if pub_date:
                try:
                    published_at = parsedate_to_datetime(pub_date).isoformat()
                except Exception:
                    published_at = None

            articles.append({
                'source': self.name,
                'url': link,
                'title': title,
                'summary': summary[:1000] if summary else None,
                'content': None,
                'published_at': published_at,
            })

        return articles
