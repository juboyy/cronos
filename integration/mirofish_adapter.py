"""MiroFish adapter: swarm simulation for financial prediction.

Wraps MiroFish's OASIS engine to simulate market reactions to news events
using synthetic agent populations informed by Cronos intelligence data.
"""
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'crawler'))
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY


def _supabase_query(table, params=''):
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}?{params}',
        headers={
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        },
    )
    resp = urllib.request.urlopen(req, timeout=15)
    return json.loads(resp.read())


def _upsert(table, data):
    body = json.dumps(data if isinstance(data, list) else [data]).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}',
        data=body,
        headers={
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation',
        },
    )
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f'  DB error: {e.code} — {e.read().decode()[:200]}')
        return None


def _llm_call(prompt, model='gemini-2.0-flash'):
    """Call Gemini for simulation reasoning."""
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}'
    payload = {
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {'temperature': 0.7, 'maxOutputTokens': 6000},
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={
        'Content-Type': 'application/json',
    })
    resp = urllib.request.urlopen(req, timeout=90)
    data = json.loads(resp.read())
    return data['candidates'][0]['content']['parts'][0]['text']


class MiroFishAdapter:
    """Adapter for financial market simulation via swarm intelligence."""
    
    AGENT_ARCHETYPES = [
        {'type': 'institutional', 'bias': 'analytical', 'risk_tolerance': 'low', 'weight': 3},
        {'type': 'retail_bull', 'bias': 'optimistic', 'risk_tolerance': 'high', 'weight': 2},
        {'type': 'retail_bear', 'bias': 'pessimistic', 'risk_tolerance': 'medium', 'weight': 2},
        {'type': 'quant', 'bias': 'data_driven', 'risk_tolerance': 'medium', 'weight': 2},
        {'type': 'hedge_fund', 'bias': 'contrarian', 'risk_tolerance': 'high', 'weight': 1},
        {'type': 'foreign_investor', 'bias': 'macro_focused', 'risk_tolerance': 'medium', 'weight': 1},
        {'type': 'analyst', 'bias': 'fundamental', 'risk_tolerance': 'low', 'weight': 2},
        {'type': 'day_trader', 'bias': 'momentum', 'risk_tolerance': 'very_high', 'weight': 1},
    ]
    
    def __init__(self):
        self.ready = True
    
    def _build_scenario_context(self, scenario, tickers=None):
        """Build rich context from Cronos data for the simulation."""
        context = {'articles': [], 'prices': {}, 'sentiment_summary': {}}
        
        # Get relevant articles
        articles = _supabase_query(
            'cronos_articles',
            f'select=title,source,summary,published_at,cronos_sentiment(score,label)'
            f'&or=(title.ilike.*{scenario.split()[0]}*)'
            f'&order=published_at.desc&limit=15'
        )
        context['articles'] = articles
        
        # Get price data for tickers
        if tickers:
            for ticker in tickers[:5]:
                prices = _supabase_query(
                    'cronos_prices',
                    f'ticker=eq.{ticker}&order=date.desc&limit=10&select=date,close,volume'
                )
                if prices:
                    context['prices'][ticker] = prices
        
        # Aggregate sentiment
        sentiments = [
            a.get('cronos_sentiment', [{}])[0].get('score', 0)
            for a in articles if a.get('cronos_sentiment')
        ]
        if sentiments:
            context['sentiment_summary'] = {
                'avg': round(sum(sentiments) / len(sentiments), 3),
                'count': len(sentiments),
                'positive_pct': round(len([s for s in sentiments if s > 0.05]) / len(sentiments) * 100, 1),
                'negative_pct': round(len([s for s in sentiments if s < -0.05]) / len(sentiments) * 100, 1),
            }
        
        # Get macro indicators
        macro = _supabase_query(
            'cronos_macro',
            'order=date.desc&limit=4&select=indicator,date,value'
        )
        context['macro'] = macro
        
        return context
    
    def simulate(self, scenario, tickers=None, config=None):
        """Run a swarm simulation for a financial scenario.
        
        Args:
            scenario: Natural language scenario description
            tickers: List of relevant tickers (e.g. ['PETR4', 'VALE3'])
            config: Optional dict with {agents: int, rounds: int, platforms: list}
        
        Returns:
            SimulationResult dict with predictions, scenarios, and agent interactions.
        """
        config = config or {}
        n_agents = config.get('agents', 50)
        n_rounds = config.get('rounds', 3)
        sim_id = str(uuid.uuid4())
        
        print(f'[MiroFish] Simulation {sim_id[:8]}')
        print(f'  Scenario: {scenario}')
        print(f'  Tickers: {tickers}')
        print(f'  Agents: {n_agents}, Rounds: {n_rounds}')
        
        # 1. Build context
        context = self._build_scenario_context(scenario, tickers)
        
        # 2. Generate agent population
        agents = []
        for archetype in self.AGENT_ARCHETYPES:
            count = max(1, int(n_agents * archetype['weight'] / sum(a['weight'] for a in self.AGENT_ARCHETYPES)))
            for i in range(count):
                agents.append({
                    'id': f'{archetype["type"]}_{i}',
                    'type': archetype['type'],
                    'bias': archetype['bias'],
                    'risk_tolerance': archetype['risk_tolerance'],
                })
        
        # 3. Run simulation via LLM (multi-round debate)
        article_context = '\n'.join([
            f'- [{a["source"]}] {a["title"]}'
            for a in context['articles'][:8]
        ]) or 'Sem artigos recentes.'
        
        price_context = ''
        if context['prices']:
            for ticker, prices in context['prices'].items():
                if prices:
                    price_context += f'\n{ticker}: R${prices[0]["close"]} (último)'
        
        macro_context = '\n'.join([
            f'- {m["indicator"]}: {m["value"]} ({m["date"]})'
            for m in context.get('macro', [])
        ]) or 'Sem dados macro.'
        
        sentiment_ctx = json.dumps(context.get('sentiment_summary', {}))
        
        prompt = f"""Você é um simulador de mercado financeiro (MiroFish/OASIS). Execute uma simulação com {len(agents)} agentes analisando o cenário abaixo.

## Cenário
{scenario}

## Tickers: {', '.join(tickers or ['N/A'])}

## Contexto do Mercado (dados reais Cronos)
### Notícias:
{article_context}

### Preços:
{price_context or 'Sem dados de preço.'}

### Indicadores Macro:
{macro_context}

### Sentimento Agregado:
{sentiment_ctx}

## Agentes ({len(agents)} total)
Tipos: {', '.join(set(a['type'] for a in agents))}

## Tarefa
Simule {n_rounds} rodadas de debate entre os agentes. Cada rodada:
1. Agentes expressam suas posições
2. Interagem e ajustam opiniões
3. Convergem ou divergem

Responda em JSON:
{{
  "simulation_id": "{sim_id}",
  "scenario": "{scenario}",
  "rounds": [
    {{
      "round": 1,
      "key_arguments": ["..."],
      "emerging_consensus": "...",
      "sentiment_shift": 0.0
    }}
  ],
  "predictions": [
    {{
      "ticker": "PETR4",
      "direction": "up|down|sideways",
      "magnitude": "small|moderate|large",
      "probability": 0.65,
      "timeframe": "1d|1w|1m",
      "reasoning": "..."
    }}
  ],
  "scenarios": [
    {{
      "name": "Bull Case",
      "probability": 0.4,
      "description": "...",
      "catalysts": ["..."]
    }},
    {{
      "name": "Bear Case",
      "probability": 0.3,
      "description": "...",
      "catalysts": ["..."]
    }},
    {{
      "name": "Base Case",
      "probability": 0.3,
      "description": "...",
      "catalysts": ["..."]
    }}
  ],
  "agent_interactions": {{
    "consensus_level": 0.6,
    "most_influential": "institutional",
    "strongest_disagreement": "...",
    "key_debate_points": ["..."]
  }},
  "confidence": 0.65,
  "caveats": ["..."]
}}"""
        
        try:
            raw = _llm_call(prompt)
            if '```json' in raw:
                raw = raw.split('```json')[1].split('```')[0]
            elif '```' in raw:
                raw = raw.split('```')[1].split('```')[0]
            
            result = json.loads(raw.strip())
            result['simulation_id'] = sim_id
            result['generated_at'] = datetime.utcnow().isoformat()
            result['engine'] = 'mirofish-adapter-v1'
            result['config'] = {'agents': len(agents), 'rounds': n_rounds}
            result['data_context'] = {
                'articles_used': len(context['articles']),
                'price_data': bool(context['prices']),
                'macro_data': len(context.get('macro', [])),
            }
            
            # 4. Persist to Supabase
            db_record = {
                'id': sim_id,
                'scenario': scenario,
                'tickers': tickers or [],
                'config': result.get('config', {}),
                'status': 'completed',
                'result': result,
            }
            saved = _upsert('cronos_simulations', db_record)
            if saved:
                print(f'  ✓ Saved to cronos_simulations')
            
            print(f'  ✓ Simulation complete: {len(result.get("predictions", []))} predictions')
            return result
            
        except json.JSONDecodeError as e:
            print(f'  [ERROR] JSON parse: {e}')
            return {'simulation_id': sim_id, 'error': 'parse_failed', 'raw': raw[:500] if 'raw' in dir() else ''}
        except Exception as e:
            print(f'  [ERROR] Simulation failed: {e}')
            return {'simulation_id': sim_id, 'error': str(e)}


if __name__ == '__main__':
    adapter = MiroFishAdapter()
    result = adapter.simulate(
        'Petrobras anuncia dividendos extraordinários de R$10 bilhões',
        tickers=['PETR4', 'PETR3'],
        config={'agents': 30, 'rounds': 3}
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))
