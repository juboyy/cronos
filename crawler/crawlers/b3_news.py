"""B3 (Bolsa de Valores) news scraper with multiple fallback strategies."""
import re
import json
import xml.etree.ElementTree as ET
from crawlers.base import BaseCrawler


class B3Crawler(BaseCrawler):
    name = 'b3'
    url = 'https://www.b3.com.br/pt_br/noticias/'

    # Multiple entry points to bypass 403
    _RSS_URLS = [
        'https://www.b3.com.br/data/files/noticias/noticias.json',
        'https://www.b3.com.br/lumis/portal/file/fileDownload.jsp?fileId=8AA8D09775E4CF6B0175E5CD1B8E0A6A',
    ]
    
    # B3 news via Google News RSS (indirect, bypasses 403)
    _GOOGLE_NEWS_URL = 'https://news.google.com/rss/search?q=site:b3.com.br+noticias&hl=pt-BR&gl=BR&ceid=BR:pt-419'
    
    # B3 investor relations RSS
    _IR_URLS = [
        'https://ri.b3.com.br/feed/',
        'https://api.b3.com.br/news/v1/articles?language=pt&limit=20',
    ]

    def fetch(self):
        articles = []

        # Strategy 1: Direct JSON API
        for api_url in self._RSS_URLS:
            raw = self._fetch_url(api_url)
            if raw:
                parsed = self._parse_json(raw)
                if parsed:
                    articles.extend(parsed)
                    break

        # Strategy 2: Google News for B3 content
        if not articles:
            raw = self._fetch_url(self._GOOGLE_NEWS_URL)
            if raw:
                parsed = self._parse_google_rss(raw)
                if parsed:
                    articles.extend(parsed)

        # Strategy 3: IR feed
        if not articles:
            for ir_url in self._IR_URLS:
                raw = self._fetch_url(ir_url)
                if raw:
                    parsed = self._try_parse_any(raw, ir_url)
                    if parsed:
                        articles.extend(parsed)
                        break

        # Strategy 4: Jina Reader (renders JS, bypasses blocks)
        if not articles:
            raw = self._fetch_via_jina(self.url)
            if raw:
                parsed = self._parse_jina_text(raw)
                if parsed:
                    articles.extend(parsed)

        return articles[:20]

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

    def _parse_google_rss(self, raw):
        """Parse Google News RSS for B3-sourced articles."""
        articles = []
        try:
            root = ET.fromstring(raw)
            for item in root.iter('item'):
                title_el = item.find('title')
                link_el = item.find('link')
                pub_el = item.find('pubDate')
                desc_el = item.find('description')

                title = title_el.text.strip() if title_el is not None and title_el.text else ''
                link = link_el.text.strip() if link_el is not None and link_el.text else ''
                pub = pub_el.text.strip() if pub_el is not None and pub_el.text else None
                desc = desc_el.text.strip() if desc_el is not None and desc_el.text else ''

                # Clean Google News title suffix " - B3"
                title = re.sub(r'\s*-\s*B3\s*$', '', title)
                # Strip HTML from description
                desc = re.sub(r'<[^>]+>', '', desc)

                if title and link:
                    articles.append({
                        'source': self.name,
                        'url': link,
                        'title': title,
                        'summary': desc[:500] if desc else None,
                        'content': None,
                        'published_at': pub,
                    })
        except ET.ParseError:
            pass
        return articles[:20]

    def _try_parse_any(self, raw, url):
        """Try JSON, then XML, then text parsing."""
        try:
            data = json.loads(raw)
            if isinstance(data, list):
                return self._parse_json(raw)
            if 'articles' in data:
                return self._parse_json(json.dumps(data['articles']))
        except (json.JSONDecodeError, ValueError):
            pass

        try:
            return self._parse_google_rss(raw)  # generic RSS
        except Exception:
            pass

        return self._parse_jina_text(raw)

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
