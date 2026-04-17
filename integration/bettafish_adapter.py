"""BettaFish adapter: multi-agent opinion analysis for Cronos.

Wraps BettaFish's MindSpider + ReportEngine to analyze public opinion
on financial topics using data enriched from Cronos intelligence feed.
"""
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime

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


def _llm_call(prompt, model='gemini-2.0-flash'):
    """Call Gemini for analysis (lightweight, no heavy deps)."""
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}'
    payload = {
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {'temperature': 0.3, 'maxOutputTokens': 4096},
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={
        'Content-Type': 'application/json',
    })
    resp = urllib.request.urlopen(req, timeout=60)
    data = json.loads(resp.read())
    return data['candidates'][0]['content']['parts'][0]['text']


class BettaFishAdapter:
    """Adapter to run opinion analysis using Cronos data context."""
    
    def __init__(self):
        self.ready = True
    
    def _fetch_cronos_context(self, topic, ticker=None, days=7):
        """Fetch relevant articles, sentiment, and entities from Cronos."""
        # Get articles related to topic
        articles = _supabase_query(
            'cronos_articles',
            f'select=id,title,source,summary,published_at,cronos_sentiment(score,label)'
            f'&or=(title.ilike.*{topic}*,summary.ilike.*{topic}*)'
            f'&order=published_at.desc&limit=20'
        )
        
        # Get entity info if ticker provided
        entity_data = None
        if ticker:
            entities = _supabase_query(
                'cronos_entities',
                f'value=eq.{ticker}&select=*&limit=1'
            )
            if entities:
                entity_data = entities[0]
            
            # Get price history
            prices = _supabase_query(
                'cronos_prices',
                f'ticker=eq.{ticker}&order=date.desc&limit=30&select=date,close,volume'
            )
        else:
            prices = []
        
        # Get impacts if available
        impacts = []
        if ticker:
            impacts = _supabase_query(
                'cronos_impacts',
                f'ticker=eq.{ticker}&order=impact_score.desc&limit=10'
                f'&select=impact_score,delta_1d,volume_anomaly,article_id'
            )
        
        return {
            'articles': articles,
            'entity': entity_data,
            'prices': prices[:10],
            'impacts': impacts,
        }
    
    def analyze_topic(self, topic, ticker=None, depth='standard'):
        """Run multi-perspective opinion analysis on a financial topic.
        
        Args:
            topic: Natural language topic (e.g. "Petrobras dividendos")
            ticker: Optional ticker for price context (e.g. "PETR4")
            depth: 'quick' (1 perspective), 'standard' (3), 'deep' (5)
        
        Returns:
            OpinionReport dict with perspectives, consensus, and confidence.
        """
        print(f'[BettaFish] Analyzing: {topic} (ticker={ticker}, depth={depth})')
        
        # 1. Fetch Cronos context
        context = self._fetch_cronos_context(topic, ticker)
        
        # 2. Build enriched prompt
        article_summaries = '\n'.join([
            f'- [{a["source"]}] {a["title"]} (sent: {a.get("cronos_sentiment", [{}])[0].get("label", "?")})'
            for a in context['articles'][:10]
        ]) or 'Nenhum artigo encontrado.'
        
        price_context = ''
        if context['prices']:
            latest = context['prices'][0]
            oldest = context['prices'][-1]
            price_context = f'\nPreço: R${latest["close"]} (atual) → R${oldest["close"]} (30d atrás)'
        
        perspectives_count = {'quick': 1, 'standard': 3, 'deep': 5}.get(depth, 3)
        
        prompt = f"""Você é um sistema de análise de opinião pública financeira (BettaFish/MindSpider).
Analise o tópico "{topic}" {f'(ticker: {ticker})' if ticker else ''} sob {perspectives_count} perspectivas diferentes.

## Contexto Cronos (dados reais)
### Artigos recentes:
{article_summaries}
{price_context}

### Impactos detectados:
{json.dumps(context['impacts'][:5], indent=2) if context['impacts'] else 'Nenhum impacto calculado ainda.'}

## Tarefa
Para cada perspectiva, gere:
1. **Persona**: nome, perfil, viés (bullish/bearish/neutro)
2. **Análise**: 2-3 parágrafos da perspectiva desse analista
3. **Tese**: resumo em 1 frase
4. **Confiança**: 0-1

Depois, gere um **Consenso** que sintetiza todas as perspectivas.

Responda em JSON válido com esta estrutura:
{{
  "topic": "{topic}",
  "ticker": "{ticker or ''}",
  "perspectives": [
    {{
      "persona": {{"name": "...", "profile": "...", "bias": "bullish|bearish|neutral"}},
      "analysis": "...",
      "thesis": "...",
      "confidence": 0.8
    }}
  ],
  "consensus": {{
    "summary": "...",
    "direction": "bullish|bearish|neutral",
    "confidence": 0.7,
    "key_factors": ["...", "..."],
    "risks": ["...", "..."]
  }},
  "data_quality": {{
    "articles_analyzed": {len(context['articles'])},
    "price_data_available": {bool(context['prices'])},
    "impacts_available": {len(context['impacts'])}
  }}
}}"""
        
        # 3. Run LLM analysis
        try:
            raw = _llm_call(prompt)
            # Extract JSON from response
            if '```json' in raw:
                raw = raw.split('```json')[1].split('```')[0]
            elif '```' in raw:
                raw = raw.split('```')[1].split('```')[0]
            
            report = json.loads(raw.strip())
            report['generated_at'] = datetime.utcnow().isoformat()
            report['engine'] = 'bettafish-adapter-v1'
            print(f'  ✓ Generated {len(report.get("perspectives", []))} perspectives')
            return report
            
        except json.JSONDecodeError as e:
            print(f'  [ERROR] JSON parse failed: {e}')
            return {
                'topic': topic,
                'ticker': ticker,
                'error': 'LLM output not valid JSON',
                'raw_output': raw[:500] if 'raw' in dir() else '',
                'generated_at': datetime.utcnow().isoformat(),
            }
        except Exception as e:
            print(f'  [ERROR] Analysis failed: {e}')
            return {
                'topic': topic,
                'ticker': ticker,
                'error': str(e),
                'generated_at': datetime.utcnow().isoformat(),
            }


if __name__ == '__main__':
    adapter = BettaFishAdapter()
    result = adapter.analyze_topic('Petrobras dividendos', ticker='PETR4')
    print(json.dumps(result, indent=2, ensure_ascii=False))
