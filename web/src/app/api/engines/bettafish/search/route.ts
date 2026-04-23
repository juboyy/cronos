import { NextResponse } from 'next/server';
import { geminiGenerate } from '@/lib/gemini';
import { supabaseQuery } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * BettaFish: Multi-Perspective Opinion Analysis Engine
 * Pipeline:
 * 1. Retrieve relevant articles from Supabase
 * 2. Run 6-analyst perspective panel + narrative mapping
 * 3. Return structured synthesis with causal chains & hidden signals
 */

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query?.trim()) {
      return NextResponse.json({ results: {}, error: 'Query vazia' }, { status: 400 });
    }

    // STEP 1: Retrieve articles matching query
    const searchTerm = query.trim();
    const articles = await supabaseQuery(
      'cronos_articles',
      `select=id,title,source,summary,published_at&or=(title.ilike.*${encodeURIComponent(searchTerm)}*,summary.ilike.*${encodeURIComponent(searchTerm)}*)&order=published_at.desc&limit=15`
    ) as Array<{ id: string; title: string; source: string; summary: string; published_at: string }>;

    // Fallback: if no matches, get latest articles
    const contextArticles = articles.length > 0
      ? articles
      : await supabaseQuery(
          'cronos_articles',
          'select=id,title,source,summary,published_at&order=published_at.desc&limit=15'
        ) as Array<{ id: string; title: string; source: string; summary: string; published_at: string }>;

    const articlesText = contextArticles
      .map((a, i) => `[${i + 1}] "${a.title}" (${a.source}, ${a.published_at?.slice(0, 10) || '?'})\n   ${(a.summary || '').slice(0, 300)}`)
      .join('\n\n');

    // STEP 2: Multi-perspective analysis with narrative mapping
    const analysisPrompt = `Você é o BettaFish, um motor de análise financeira multi-perspectiva para o mercado brasileiro.

QUERY DO USUÁRIO: ${query}

ARTIGOS DISPONÍVEIS (${contextArticles.length} fontes):
${articlesText}

Execute uma análise completa com o seguinte painel de 6 analistas:

1. **Analista Bull** (otimista) — melhor cenário, oportunidades
2. **Analista Bear** (pessimista) — piores riscos, ameaças
3. **Analista Quant** (dados) — indicadores estatísticos, correlações
4. **Economista Macro** (macro) — Selic, IPCA, câmbio, fiscal, contexto global
5. **Especialista Setorial** — dinâmica específica do setor mais afetado
6. **Avaliador de Risco** — riscos de cauda, proteção, hedging

Além das perspectivas individuais, faça:
- MAPEAMENTO DE NARRATIVAS: Identifique os temas dominantes entre as fontes
- SINAIS OCULTOS: O que está implícito mas não declarado nas notícias?
- CADEIA CAUSAL: Como os eventos se propagam até afetar preços?

Retorne JSON:
{
  "perspectives": [
    {
      "role": "bull_analyst",
      "label": "Analista Bull",
      "stance": "bullish",
      "confidence": 0.0-1.0,
      "analysis": "2-3 parágrafos de análise detalhada",
      "key_argument": "Argumento central em 1 frase",
      "evidence": ["evidência 1", "evidência 2"],
      "affected_tickers": ["PETR4", "VALE3"],
      "price_impact_estimate": "positivo +1-3%"
    }
  ],
  "synthesis": {
    "overall_sentiment": "bullish|bearish|neutral|mixed",
    "confidence": 0.0-1.0,
    "key_takeaway": "Parágrafo de síntese principal",
    "consensus_points": ["ponto 1", "ponto 2"],
    "disagreement_points": ["ponto 1", "ponto 2"],
    "recommended_action": "Recomendação acionável em português",
    "risk_level": "low|medium|high|critical"
  },
  "narratives": [
    {
      "theme": "Tema narrativo dominante",
      "sources_supporting": ["fonte1", "fonte2"],
      "strength": 0.0-1.0,
      "market_implication": "Implicação para o mercado"
    }
  ],
  "hidden_signals": [
    {
      "signal": "O que está sendo implicado",
      "evidence": "Evidência textual de suporte",
      "potential_impact": "Impacto se o sinal se materializar"
    }
  ],
  "causal_chain": [
    {
      "event": "Evento gatilho",
      "transmission": "Como se propaga",
      "affected_entities": ["PETR4"],
      "expected_timeline": "1-3 dias"
    }
  ],
  "entity_impact": [
    {
      "entity": "PETR4",
      "sentiment": "bullish|bearish|neutral",
      "impact_score": 0.0-1.0,
      "reasoning": "Por que essa entidade é afetada"
    }
  ],
  "executive_summary": "2-3 parágrafos de síntese executiva em português",
  "actionable_insight": "Recomendação acionável em 1 frase"
}

IMPORTANTE:
- Tudo em Português (PT-BR)
- Perspectiva do mercado brasileiro (B3, Selic, IPCA, CDI)
- Seja específico com tickers da B3
- Cada perspectiva deve ser INDEPENDENTE e substantiva
- Sinais ocultos devem ser insights não-óbvios`;

    const result = await geminiGenerate(analysisPrompt, {
      temperature: 0.4,
      maxTokens: 8192,
      json: true,
    });

    if (!result.ok) {
      return NextResponse.json({
        results: { error: { source: 'gemini', success: false, message: result.error } },
        error: result.error,
      });
    }

    const data = result.data as Record<string, unknown>;

    return NextResponse.json({
      results: data,
      status: 'completed',
      articles_used: contextArticles.length,
      articles_matched: articles.length,
    });
  } catch (e) {
    console.error('BettaFish Error:', e);
    return NextResponse.json({ results: {}, error: String(e) });
  }
}
