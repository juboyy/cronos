"""Bloomberg Línea Brasil crawler — https://www.bloomberglinea.com.br"""
from crawlers.base import BaseCrawler


class BloombergLineaCrawler(BaseCrawler):
    name = 'bloomberg_linea'
    url = 'https://www.bloomberglinea.com.br/feed/'

    def fetch(self):
        raw = self._fetch_url(self.url)
        if not raw:
            return []
        return self._parse_rss(raw)
