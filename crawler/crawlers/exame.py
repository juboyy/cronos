"""Exame general feed crawler (filters economia/finance articles)."""
import xml.etree.ElementTree as ET
import re
from email.utils import parsedate_to_datetime
from crawlers.base import BaseCrawler


class ExameCrawler(BaseCrawler):
    name = 'exame'
    url = 'https://exame.com/feed/'

    # Filter to economia/finance categories
    FINANCE_KEYWORDS = ['economia', 'mercado', 'investimento', 'bolsa', 'dólar',
                        'selic', 'inflação', 'pib', 'copom', 'ação', 'b3',
                        'ibovespa', 'juros', 'câmbio', 'tesouro', 'cdb',
                        'dividendo', 'banco central', 'ipca', 'meta fiscal']

    # Categories that are definitely finance
    FINANCE_CATEGORIES = ['economia', 'invest', 'mercado', 'negocios', 'negócios',
                          'business', 'finanças', 'finance', 'money']

    def fetch(self):
        raw = self._fetch_with_fallback(self.url)
        if not raw:
            return []
        return self.parse(raw)

    def _is_finance(self, title, summary, categories):
        """Check if article is finance-related. Category match is strong signal."""
        cats_lower = ' '.join(categories).lower()
        # Strong match: finance category
        if any(fc in cats_lower for fc in self.FINANCE_CATEGORIES):
            return True
        # Weak match: keyword in title only (not summary to avoid false positives)
        title_lower = title.lower()
        return sum(1 for kw in self.FINANCE_KEYWORDS if kw in title_lower) >= 2

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

            # Get categories
            categories = [c.text.strip() for c in item.findall('category') if c.text]

            desc = item.find('content:encoded', ns)
            if desc is not None and desc.text:
                summary = re.sub(r'<[^>]+>', '', desc.text).strip()
            else:
                summary = item.findtext('description', '').strip()
                summary = re.sub(r'<[^>]+>', '', summary).strip()

            # Only include finance-related articles
            if not self._is_finance(title, summary, categories):
                continue

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
