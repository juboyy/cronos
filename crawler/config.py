import os
import json

# Load config from openclaw.json
_config_path = os.path.join(os.path.expanduser('~'), '.openclaw', 'openclaw.json')
_cfg = {}
if os.path.exists(_config_path):
    with open(_config_path) as f:
        _cfg = json.load(f).get('env', {})

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://apkflemxmsbdltziouls.supabase.co')
SUPABASE_SERVICE_KEY = _cfg.get('SUPABASE_DASHBOARD_SERVICE_ROLE_KEY',
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY', ''))
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY',
    _cfg.get('GOOGLE_AI_API_KEY', _cfg.get('GOOGLE_API_KEY', '')))
JINA_API_KEY = os.environ.get('JINA_API_KEY',
    _cfg.get('JINA_API_KEY', 'jina_ec949e78573343a791cd0d6303f0bfa5JWZr4a0lzfoQQBiUdP-g-rQG7VOW'))

# Antigravity (Opus) for sentiment — free via subscription
ANTIGRAVITY_API_KEY = os.environ.get('ANTIGRAVITY_API_KEY',
    _cfg.get('ANTIGRAVITY_API_KEY', ''))
ANTIGRAVITY_BASE_URL = os.environ.get('ANTIGRAVITY_BASE_URL',
    _cfg.get('ANTIGRAVITY_BASE_URL', ''))
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY',
    _cfg.get('OPENAI_API_KEY', ''))

SOURCES = {
    'infomoney': 'https://www.infomoney.com.br/feed/',
    'valor': 'https://pox.globo.com/rss/valor/',
    'b3': 'https://www.b3.com.br/pt_br/noticias/',
    'bcb': 'https://www.bcb.gov.br/api/servico/sitebcb/agenciabcb?quantidade=10',
    'reuters': 'https://www.reuters.com/news/archive/brasilNews',
}

REQUEST_TIMEOUT = 10
MAX_RETRIES = 3
USER_AGENTS = [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 Safari/605.1.15',
]
