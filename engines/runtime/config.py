"""Cronos Engine Runtime Configuration."""
import os
import json

_conf_path = os.path.expanduser('~/.openclaw/openclaw.json')
_conf = {}
if os.path.exists(_conf_path):
    with open(_conf_path) as f:
        _conf = json.load(f)

_env = _conf.get('env', {})

LLM_API_KEY = _env.get('GOOGLE_API_KEY', os.environ.get('GOOGLE_API_KEY', os.environ.get('GOOGLE_AI_API_KEY', '')))
LLM_MODEL = 'gemini-2.0-flash'
LLM_MODEL_PRO = 'gemini-2.5-pro-preview-05-06'
LLM_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

OPENAI_API_KEY = _env.get('OPENAI_API_KEY', os.environ.get('OPENAI_API_KEY', ''))

ZEP_API_KEY = _env.get('ZEP_API_KEY', os.environ.get('ZEP_API_KEY', ''))

SUPABASE_URL = _env.get('SUPABASE_URL', 'https://apkflemxmsbdltziouls.supabase.co')
SUPABASE_SERVICE_KEY = _env.get('SUPABASE_DASHBOARD_SERVICE_ROLE_KEY',
    _env.get('SUPABASE_SERVICE_ROLE_KEY', ''))

ENGINE_HOST = '0.0.0.0'
ENGINE_PORT = 5050

DEFAULT_AGENT_COUNT = 12
MAX_SIMULATION_ROUNDS = 8
CONVERGENCE_THRESHOLD = 0.85
MIN_ROUNDS_BEFORE_EXIT = 3

AGENT_ARCHETYPES = [
    'institutional_investor',
    'retail_trader',
    'quantitative_analyst',
    'macro_economist',
    'sector_specialist',
    'risk_manager',
    'central_bank_watcher',
    'political_analyst',
    'technical_analyst',
    'market_maker',
    'venture_capitalist',
    'journalist',
]

SIMULATION_PRESETS = {
    'quick': {
        'label': 'Quick',
        'description': 'Análise rápida — 6 agentes, 3 rounds, resposta em ~30s',
        'agent_count': 6,
        'max_rounds': 3,
        'model': 'flash',
        'temperature': 0.5,
        'convergence_threshold': 0.75,
        'early_exit': True,
        'min_rounds': 2,
        'archetypes': [
            'institutional_investor',
            'quantitative_analyst',
            'macro_economist',
            'technical_analyst',
            'risk_manager',
            'sector_specialist',
        ],
    },
    'standard': {
        'label': 'Standard',
        'description': 'Análise balanceada — 12 agentes, 8 rounds, cobertura completa',
        'agent_count': 12,
        'max_rounds': 8,
        'model': 'flash',
        'temperature': 0.6,
        'convergence_threshold': 0.85,
        'early_exit': True,
        'min_rounds': 3,
        'archetypes': AGENT_ARCHETYPES,
    },
    'deep': {
        'label': 'Deep',
        'description': 'Análise profunda — 20 agentes, 12 rounds, modelo Pro, máxima cobertura',
        'agent_count': 20,
        'max_rounds': 12,
        'model': 'pro',
        'temperature': 0.4,
        'convergence_threshold': 0.92,
        'early_exit': False,
        'min_rounds': 5,
        'archetypes': AGENT_ARCHETYPES + [
            'commodity_trader',
            'derivatives_specialist',
            'esg_analyst',
            'retail_banker',
            'hedge_fund_pm',
            'regulador_bcb',
            'credit_analyst',
            'emerging_markets_pm',
        ],
    },
}

def resolve_model(model_key: str) -> str:
    """Resolve 'flash'/'pro' to actual model name."""
    return LLM_MODEL_PRO if model_key == 'pro' else LLM_MODEL

def get_preset(name: str) -> dict:
    """Get a preset config by name, or return standard if not found."""
    return SIMULATION_PRESETS.get(name, SIMULATION_PRESETS['standard']).copy()
