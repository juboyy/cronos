"""B3 (Bolsa de Valores) news scraper with Jina fallback."""
import re
import json
from crawlers.base import BaseCrawler


class B3Crawler(BaseCrawler):
    name = 'b3'
    url = 'https://www.b3.com.br/pt_br/noticias/'

    def fetch(self):
        # B3 page is JS-rendered. Try the API endpoint first
        api_url = 'https://www.b3.com.br/data/files/noticias/noticias.json'
        raw = self._fetch_url(api_url)
        if raw:
            articles = self._parse_json(raw)
            if articles:
                return articles

        # Fallback: Jina Reader (renders JS, bypasses blocks)
        raw = self._fetch_via_jina(self.url)
        if raw:
            return self._parse_jina_text(raw)

        return []

    def _parse_json(self, raw):
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

    def _parse_jina_text(self, text):
        """Parse Jina Reader markdown output for news items."""
        articles = []
        # Jina returns markdown. Look for links with news titles
        for match in re.finditer(r'\[([^\]]{15,})\]\((https?://[^\)]+b3[^\)]+)\)', text):
            title = match.group(1).strip()
            url = match.group(2)
            if title and 'noticia' in url.lower() or len(title) > 20:
                articles.append({
                    'source': self.name,
                    'url': url,
                    'title': title,
                    'summary': None,
                    'content': None,
                    'published_at': None,
                })

        # Also try line-by-line for non-link titles
        if not articles:
            lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 20]
            for line in lines[:15]:
                line = re.sub(r'^[#*\->\s]+', '', line).strip()
                if len(line) > 20 and not line.startswith('http'):
                    articles.append({
                        'source': self.name,
                        'url': f'https://www.b3.com.br/pt_br/noticias/#jina-{hash(line)}',
                        'title': line[:200],
                        'summary': None,
                        'content': None,
                        'published_at': None,
                    })

        return articles[:20]
