"""BettaFish Lite — Multi-perspective opinion analysis engine.

Generates analyst personas that debate a financial topic from
different angles (bull/bear/neutral), producing an opinionated
synthesis report with evidence-based arguments.
"""
import json
import uuid
import time
from datetime import datetime
from typing import List, Dict, Optional
from llm import generate_json, generate


ANALYST_PERSPECTIVES = [
    {'role': 'bull_analyst', 'label': 'Analista Bull', 'bias': 'otimista'},
    {'role': 'bear_analyst', 'label': 'Analista Bear', 'bias': 'pessimista'},
    {'role': 'quant_analyst', 'label': 'Analista Quant', 'bias': 'dados e estatísticas'},
    {'role': 'macro_economist', 'label': 'Economista Macro', 'bias': 'contexto macroeconômico'},
    {'role': 'sector_specialist', 'label': 'Especialista Setorial', 'bias': 'dinâmica do setor'},
    {'role': 'risk_assessor', 'label': 'Avaliador de Risco', 'bias': 'riscos e proteção'},
]


def analyze_article(
    title: str,
    content: str,
    entities: List[str] = None,
    market_context: str = '',
) -> Dict:
    """Run multi-perspective analysis on a news article."""
    analysis_id = f'betta_{uuid.uuid4().hex[:12]}'
    
    entity_str = ', '.join(entities) if entities else 'N/A'
    
    prompt = f"""You are running a multi-perspective financial analysis panel.

ARTICLE TITLE: {title}

ARTICLE CONTENT:
{content[:3000]}

RELATED ENTITIES: {entity_str}

MARKET CONTEXT: {market_context or 'N/A'}

For each of these 6 analyst perspectives, generate an independent analysis:
1. Bull Analyst (otimista) — best-case interpretation
2. Bear Analyst (pessimista) — worst-case interpretation
3. Quant Analyst (dados) — statistical/data-driven view
4. Macro Economist — broader economic implications
5. Sector Specialist — industry-specific impact
6. Risk Assessor — risks and protection strategies

Return JSON:
{{
  "perspectives": [
    {{
      "role": "bull_analyst",
      "label": "Analista Bull",
      "stance": "bullish" | "bearish" | "neutral",
      "confidence": 0.0-1.0,
      "analysis": "2-3 paragraph analysis in Portuguese",
      "key_argument": "1 sentence core argument",
      "evidence": ["evidence1", "evidence2"],
      "affected_tickers": ["PETR4", "VALE3"],
      "price_impact_estimate": "positive +1-3%" | "negative -1-3%" | "neutral"
    }}
  ],
  "synthesis": {{
    "overall_sentiment": "bullish" | "bearish" | "neutral",
    "confidence": 0.0-1.0,
    "key_takeaway": "Portuguese synthesis paragraph",
    "consensus_points": ["point1", "point2"],
    "disagreement_points": ["point1", "point2"],
    "recommended_action": "Portuguese action recommendation",
    "risk_level": "low" | "medium" | "high" | "critical"
  }},
  "entity_impact": [
    {{
      "entity": "PETR4",
      "sentiment": "bullish" | "bearish" | "neutral",
      "impact_score": 0.0-1.0,
      "reasoning": "Why this entity is affected"
    }}
  ]
}}

All analysis in Portuguese. Be specific about Brazilian market dynamics."""

    result = generate_json(prompt, temperature=0.4)
    
    if not result['ok']:
        return {
            'analysis_id': analysis_id,
            'status': 'error',
            'error': result.get('error'),
            'title': title,
        }
    
    data = result['data']
    data['analysis_id'] = analysis_id
    data['status'] = 'completed'
    data['title'] = title
    data['created_at'] = datetime.utcnow().isoformat()
    return data


def deep_opinion_analysis(
    topic: str,
    articles: List[Dict],
    market_data: str = '',
) -> Dict:
    """Run deep opinion analysis across multiple articles on a topic.
    
    This is BettaFish's InsightEngine equivalent — synthesizes
    multiple news sources into a comprehensive opinion report.
    """
    analysis_id = f'deep_{uuid.uuid4().hex[:12]}'
    
    articles_text = '\n\n'.join([
        f"[{a.get('source', '?')}] {a.get('title', '?')}\n{a.get('summary', '')[:500]}"
        for a in articles[:10]
    ])
    
    prompt = f"""You are a senior financial analyst performing a deep opinion synthesis.

TOPIC: {topic}

NEWS ARTICLES ({len(articles)} sources):
{articles_text}

{f"MARKET DATA: {market_data}" if market_data else ""}

Perform a comprehensive multi-source analysis:

1. NARRATIVE MAPPING: Identify the dominant narratives across sources
2. SENTIMENT CONVERGENCE: Where do sources agree?
3. SENTIMENT DIVERGENCE: Where do they disagree?
4. HIDDEN SIGNALS: What's being implied but not stated?
5. CAUSAL CHAIN: What's the transmission mechanism to markets?

Return JSON:
{{
  "narratives": [
    {{
      "theme": "Narrative theme",
      "sources_supporting": ["source1", "source2"],
      "strength": 0.0-1.0,
      "market_implication": "Portuguese description"
    }}
  ],
  "sentiment_map": {{
    "overall": "bullish" | "bearish" | "neutral" | "mixed",
    "confidence": 0.0-1.0,
    "by_source": {{"source": "sentiment"}},
    "convergence_score": 0.0-1.0
  }},
  "hidden_signals": [
    {{
      "signal": "What's being implied",
      "evidence": "Supporting text",
      "potential_impact": "Market impact if signal materializes"
    }}
  ],
  "causal_chain": [
    {{
      "event": "Trigger event",
      "transmission": "How it propagates",
      "affected_entities": ["PETR4"],
      "expected_timeline": "1-3 days"
    }}
  ],
  "executive_summary": "2-3 paragraphs in Portuguese",
  "risk_assessment": {{
    "level": "low" | "medium" | "high" | "critical",
    "factors": ["risk1", "risk2"],
    "mitigation": "Portuguese suggestion"
  }}
}}

All content in Portuguese. Be specific, data-driven, and actionable."""

    result = generate_json(prompt, temperature=0.3)
    
    if not result['ok']:
        return {
            'analysis_id': analysis_id,
            'status': 'error',
            'error': result.get('error'),
        }
    
    data = result['data']
    data['analysis_id'] = analysis_id
    data['status'] = 'completed'
    data['topic'] = topic
    data['article_count'] = len(articles)
    data['created_at'] = datetime.utcnow().isoformat()
    return data
