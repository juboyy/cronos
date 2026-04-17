"""BCB (Banco Central) news crawler with Jina fallback."""
import json
import re
from crawlers.base import BaseCrawler


class BCBCrawler(BaseCrawler):
    name = 'bcb'
    # Primary: API endpoint
    url = 'https://www.bcb.gov.br/api/servico/sitebcb/agenciabcb?quantidade=10'
    # Fallback: human-readable page
    page_url = 'https://www.bcb.gov.br/detalhenoticia'

    def fetch(self):
        # Try API first
        raw = self._fetch_url(self.url)
        if raw:
            articles = self.parse(raw)
            if articles:
                return articles

        # Try alternative API endpoints
        alt_urls = [
            'https://www.bcb.gov.br/api/servico/sitebcb/noticias?quantidade=10',
            'https://www.bcb.gov.br/api/servico/sitebcb/comunicado?quantidade=10',
        ]
        for alt in alt_urls:
            raw = self._fetch_url(alt)
            if raw:
                articles = self.parse(raw)
                if articles:
                    return articles

        # Fallback: Jina Reader on the news page
        raw = self._fetch_via_jina('https://www.bcb.gov.br/noticias')
        if raw:
            return self._parse_jina_text(raw)

        return []

    def parse(self, raw):
        articles = []
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            print(f'  [{self.name}] JSON parse error: {e}')
            return []

        conteudos = data.get('conteudo', [])
        if isinstance(data, list):
            conteudos = data

        for item in conteudos:
            title = item.get('Titulo', item.get('titulo', '')).strip()
            if not title:
                continue

            url = item.get('Url', item.get('url', ''))
            if url and not url.startswith('http'):
                url = f'https://www.bcb.gov.br{url}'
            if not url:
                url = f'https://www.bcb.gov.br/detalhenoticia/{item.get("Id", item.get("id", ""))}'

            summary = item.get('Subtitulo', item.get('subtitulo', item.get('Resumo', '')))
            published_at = item.get('DataReferencia', item.get('dataReferencia'))

            articles.append({
                'source': self.name,
                'url': url,
                'title': title,
                'summary': summary[:1000] if summary else None,
                'content': None,
                'published_at': published_at,
            })

        return articles

    def _parse_jina_text(self, text):
        """Parse Jina Reader markdown for BCB news."""
        articles = []
        for match in re.finditer(r'\[([^\]]{15,})\]\((https?://[^\)]*bcb[^\)]*)\)', text):
            title = match.group(1).strip()
            url = match.group(2)
            articles.append({
                'source': self.name,
                'url': url,
                'title': title,
                'summary': None,
                'content': None,
                'published_at': None,
            })

        if not articles:
            lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 25]
            for line in lines[:10]:
                line = re.sub(r'^[#*\->\s]+', '', line).strip()
                if len(line) > 25 and not line.startswith('http') and not line.startswith('|'):
                    articles.append({
                        'source': self.name,
                        'url': f'https://www.bcb.gov.br/noticias#jina-{hash(line)}',
                        'title': line[:200],
                        'summary': None,
                        'content': None,
                        'published_at': None,
                    })

        return articles[:15]
