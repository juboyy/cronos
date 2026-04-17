"""Base crawler with retry, rate limiting, and user-agent rotation."""
import urllib.request
import urllib.error
import time
import random
from config import REQUEST_TIMEOUT, MAX_RETRIES, USER_AGENTS


class BaseCrawler:
    name = 'base'
    url = ''

    def _get_headers(self):
        return {
            'User-Agent': random.choice(USER_AGENTS),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        }

    def _fetch_url(self, url, timeout=None):
        """Fetch URL with retries and exponential backoff."""
        timeout = timeout or REQUEST_TIMEOUT
        last_err = None
        for attempt in range(MAX_RETRIES):
            try:
                req = urllib.request.Request(url, headers=self._get_headers())
                resp = urllib.request.urlopen(req, timeout=timeout)
                return resp.read().decode('utf-8', errors='replace')
            except Exception as e:
                last_err = e
                wait = (2 ** attempt) + random.random()
                print(f'  [{self.name}] Retry {attempt+1}/{MAX_RETRIES} in {wait:.1f}s: {e}')
                time.sleep(wait)
        print(f'  [{self.name}] Failed after {MAX_RETRIES} retries: {last_err}')
        return None

    def fetch(self):
        """Fetch and parse articles. Override in subclasses."""
        raise NotImplementedError

    def parse(self, raw):
        """Parse raw response into article dicts. Override in subclasses."""
        raise NotImplementedError
