"""Seu Dinheiro crawler — https://www.seudinheiro.com"""
from crawlers.base import BaseCrawler


class SeuDinheiroCrawler(BaseCrawler):
    name = 'seudinheiro'
    url = 'https://www.seudinheiro.com/feed/'

    def fetch(self):
        raw = self._fetch_url(self.url)
        if not raw:
            return []
        return self._parse_rss(raw)
