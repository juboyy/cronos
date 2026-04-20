"""Valor Econômico RSS crawler."""
from crawlers.base import BaseCrawler


class ValorCrawler(BaseCrawler):
    name = 'valor'
    url = 'https://pox.globo.com/rss/valor/'

    def fetch(self):
        raw = self._fetch_url(self.url)
        if not raw:
            return []
        return self._parse_rss(raw)
