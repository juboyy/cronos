import { geminiGenerate } from '@/lib/gemini';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/cronos/deep-analysis — BettaFish multi-article synthesis (serverless)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, articles, market_data } = body;

    if (!topic || !articles?.length) {
      return NextResponse.json({ error: 'topic and articles[] required' }, { status: 400 });
    }

    const articlesText = articles
      .slice(0, 10)
      .map((a: { source?: string; title?: string; summary?: string }, i: number) =>
        `[${i + 1}] (${a.source || '?'}) ${a.title || '?'}\n${(a.summary || '').slice(0, 500)}`
      )
      .join('\n\n');

    const prompt = `Você é o BettaFish, realizando uma síntese profunda de opinião financeira.

TÓPICO: ${topic}

ARTIGOS (${articles.length} fontes):
${articlesText}

${market_data ? `DADOS DE MERCADO: ${market_data}` : ''}

Analise:
1. MAPEAMENTO NARRATIVO: Narrativas dominantes
2. CONVERGÊNCIA DE SENTIMENTO: Onde as fontes concordam?
3. DIVERGÊNCIA: Onde discordam?
4. SINAIS OCULTOS: O que está implícito?
5. CADEIA CAUSAL: Mecanismo de transmissão para mercados?

Retorne JSON:
{
  "narratives": [{"theme": "...", "sources_supporting": ["..."], "strength": 0.0-1.0, "market_implication": "..."}],
  "sentiment_map": {"overall": "bullish|bearish|neutral|mixed", "confidence": 0.0-1.0, "convergence_score": 0.0-1.0},
  "hidden_signals": [{"signal": "...", "evidence": "...", "potential_impact": "..."}],
  "causal_chain": [{"event": "...", "transmission": "...", "affected_entities": ["PETR4"], "expected_timeline": "..."}],
  "executive_summary": "2-3 parágrafos em Português",
  "risk_assessment": {"level": "low|medium|high|critical", "factors": ["..."], "mitigation": "..."},
  "analysis_id": "deep_${Date.now()}",
  "status": "completed",
  "topic": "${topic.replace(/"/g, '\\"')}",
  "article_count": ${articles.length}
}

Tudo em Português. Mercado brasileiro.`;

    const result = await geminiGenerate(prompt, { temperature: 0.3, maxTokens: 8192, json: true });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
