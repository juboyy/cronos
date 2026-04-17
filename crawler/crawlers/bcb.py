"""BCB (Banco Central) news crawler via API."""
import json
from crawlers.base import BaseCrawler


class BCBCrawler(BaseCrawler):
    name = 'bcb'
    url = 'https://www.bcb.gov.br/api/servico/sitebcb/agenciabcb?quantidade=10'

    def fetch(self):
        raw = self._fetch_url(self.url)
        if not raw:
            return []
        return self.parse(raw)

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
