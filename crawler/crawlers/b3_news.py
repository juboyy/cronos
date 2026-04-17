"""B3 (Bolsa de Valores) news scraper."""
import re
from crawlers.base import BaseCrawler


class B3Crawler(BaseCrawler):
    name = 'b3'
    url = 'https://www.b3.com.br/pt_br/noticias/'

    def fetch(self):
        # B3 page is JS-rendered. Try the API endpoint instead
        api_url = 'https://www.b3.com.br/data/files/noticias/noticias.json'
        raw = self._fetch_url(api_url)
        if raw:
            return self._parse_json(raw)

        # Fallback: try HTML scraping
        raw = self._fetch_url(self.url)
        if not raw:
            return []
        return self.parse(raw)

    def _parse_json(self, raw):
        import json
        articles = []
        try:
            data = json.loads(raw)
            items = data if isinstance(data, list) else data.get('items', data.get('noticias', []))
        except (json.JSONDecodeError, AttributeError):
            return []

        for item in items[:20]:
            title = item.get('titulo', item.get('title', '')).strip()
            url = item.get('url', item.get('link', ''))
            if url and not url.startswith('http'):
                url = f'https://www.b3.com.br{url}'
            if not title or not url:
                continue

            articles.append({
                'source': self.name,
                'url': url,
                'title': title,
                'summary': item.get('resumo', item.get('description', ''))[:1000],
                'content': None,
                'published_at': item.get('data', item.get('date')),
            })
        return articles

    def parse(self, raw):
        articles = []
        # Basic HTML extraction
        pattern = r'<a[^>]+href="(/pt_br/noticias/[^"]+)"[^>]*>([^<]+)</a>'
        for match in re.finditer(pattern, raw):
            url = f'https://www.b3.com.br{match.group(1)}'
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
