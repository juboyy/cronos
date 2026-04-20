"""InfoMoney RSS crawler."""
from crawlers.base import BaseCrawler


class InfoMoneyCrawler(BaseCrawler):
    name = 'infomoney'
    url = 'https://www.infomoney.com.br/feed/'

    def fetch(self):
        raw = self._fetch_url(self.url)
        if not raw:
            return []
        return self._parse_rss(raw)
