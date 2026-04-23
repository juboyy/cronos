import { NextResponse } from 'next/server';
import { geminiGenerate } from '@/lib/gemini';
import { supabaseQuery } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query || !query.trim()) {
      return NextResponse.json({ results: {}, error: 'Query vazia' }, { status: 400 });
    }

    // Fetch recent articles from Supabase for context
    const articles = await supabaseQuery(
      'cronos_articles',
      `select=id,title,source,summary,published_at&order=published_at.desc&limit=20`
    ) as Array<{ id: string; title: string; source: string; summary: string; published_at: string }>;

    const articlesContext = articles
      .map((a, i) => `[${i + 1}] ${a.title} (${a.source}) — ${(a.summary || '').slice(0, 200)}`)
      .join('\n');

    const prompt = `Você é o BettaFish, um motor de análise financeira multi-perspectiva.

QUERY DO USUÁRIO: ${query}

ARTIGOS RECENTES DO MERCADO BRASILEIRO:
${articlesContext}

Analise a query do usuário considerando os artigos disponíveis. Retorne JSON:
{
  "insight": {
    "summary": "Resumo analítico em 2-3 parágrafos",
    "sentiment": "bullish" | "bearish" | "neutral" | "mixed",
    "confidence": 0.0-1.0,
    "key_factors": ["fator1", "fator2"],
    "affected_tickers": ["PETR4", "VALE3"]
  },
  "related_articles": [{"title": "...", "source": "...", "relevance": 0.0-1.0}],
  "perspectives": [
    {"role": "bull", "argument": "...", "confidence": 0.0-1.0},
    {"role": "bear", "argument": "...", "confidence": 0.0-1.0},
    {"role": "quant", "argument": "...", "confidence": 0.0-1.0}
  ],
  "actionable_insight": "Recomendação acionável em 1 frase"
}

Tudo em Português. Perspectiva do mercado brasileiro.`;

    const result = await geminiGenerate(prompt, { temperature: 0.4, json: true });

    if (!result.ok) {
      return NextResponse.json({ results: {}, error: result.error });
    }

    return NextResponse.json({ results: result.data, status: 'completed' });
  } catch (e) {
    return NextResponse.json({ results: {}, error: String(e) });
  }
}
