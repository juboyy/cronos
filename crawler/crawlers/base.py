"""Base crawler with retry, rate limiting, user-agent rotation, and Jina fallback."""
import urllib.request
import urllib.error
import json
import time
import random
from config import REQUEST_TIMEOUT, MAX_RETRIES, USER_AGENTS, JINA_API_KEY


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

    def _fetch_via_jina(self, url):
        """Fetch URL via Jina Reader API — bypasses blocks, JS rendering, anti-bot."""
        if not JINA_API_KEY:
            print(f'  [{self.name}] No Jina API key — skipping Jina fallback')
            return None

        jina_url = f'https://r.jina.ai/{url}'
        req = urllib.request.Request(jina_url, headers={
            'Authorization': f'Bearer {JINA_API_KEY}',
            'Accept': 'application/json',
            'X-Return-Format': 'text',
        })

        try:
            resp = urllib.request.urlopen(req, timeout=30)
            content = resp.read().decode('utf-8', errors='replace')
            print(f'  [{self.name}] Jina fetched {len(content)} chars')
            return content
        except Exception as e:
            print(f'  [{self.name}] Jina error: {e}')
            return None

    def _fetch_with_fallback(self, url, timeout=None):
        """Try direct fetch first, fall back to Jina if it fails."""
        result = self._fetch_url(url, timeout)
        if result:
            return result
        print(f'  [{self.name}] Direct fetch failed, trying Jina Reader...')
        return self._fetch_via_jina(url)

    def fetch(self):
        """Fetch and parse articles. Override in subclasses."""
        raise NotImplementedError

    def parse(self, raw):
        """Parse raw response into article dicts. Override in subclasses."""
        raise NotImplementedError
