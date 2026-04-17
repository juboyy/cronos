"""Reuters/Google News Brazil scraper with Jina fallback."""
import re
import xml.etree.ElementTree as ET
from crawlers.base import BaseCrawler


class ReutersCrawler(BaseCrawler):
    name = 'reuters'
    url = 'https://www.reuters.com/news/archive/brasilNews'

    def fetch(self):
        # Try Google News RSS first (more reliable than direct Reuters)
        gn_url = 'https://news.google.com/rss/search?q=brasil+finan%C3%A7as+mercado&hl=pt-BR&gl=BR&ceid=BR:pt-419'
        raw = self._fetch_url(gn_url)
        if raw and '<item' in raw:
            articles = self._parse_rss(raw)
            if articles:
                return articles

        # Try Reuters RSS
        raw = self._fetch_url('https://www.reuters.com/rssFeed/businessNews')
        if raw and '<item' in raw:
            articles = self._parse_rss(raw)
            if articles:
                return articles

        # Fallback: Jina Reader on Reuters Brazil
        raw = self._fetch_via_jina(self.url)
        if raw:
            return self._parse_jina_text(raw)

        # Last resort: Jina on Google News Brazil finance
        raw = self._fetch_via_jina('https://news.google.com/search?q=brasil%20finan%C3%A7as%20mercado&hl=pt-BR&gl=BR')
        if raw:
            return self._parse_jina_text(raw)

        return []

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

    def _parse_jina_text(self, text):
        """Parse Jina Reader markdown output for news items."""
        articles = []
        # Match markdown links
        for match in re.finditer(r'\[([^\]]{15,})\]\((https?://[^\)]+)\)', text):
            title = match.group(1).strip()
            url = match.group(2)
            # Filter out navigation/non-news links
            if any(x in title.lower() for x in ['cookie', 'sign in', 'log in', 'menu', 'navigation']):
                continue
            articles.append({
                'source': self.name,
                'url': url,
                'title': title[:200],
                'summary': None,
                'content': None,
                'published_at': None,
            })

        return articles[:20]

    def parse(self, raw):
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
