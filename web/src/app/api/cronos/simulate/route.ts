import { geminiGenerate } from '@/lib/gemini';
import { supabaseQuery } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PRESETS = {
  quick: {
    label: 'Quick',
    description: 'Análise rápida — 6 agentes, 3 rounds, resposta em ~30s',
    agent_count: 6,
    max_rounds: 3,
  },
  standard: {
    label: 'Standard',
    description: 'Análise balanceada — 12 agentes, 8 rounds, cobertura completa',
    agent_count: 12,
    max_rounds: 5,
  },
  deep: {
    label: 'Deep',
    description: 'Análise profunda — 20 agentes, 12 rounds, máxima cobertura',
    agent_count: 20,
    max_rounds: 8,
  },
};

// POST: run simulation inline via Gemini
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenario, tickers, context, market_data, preset } = body;

    if (!scenario) {
      return NextResponse.json({ error: 'scenario required' }, { status: 400 });
    }

    const p = PRESETS[preset as keyof typeof PRESETS] || PRESETS.standard;

    // Fetch recent articles for market context
    const articles = await supabaseQuery(
      'cronos_articles',
      'select=title,source,summary&order=published_at.desc&limit=15'
    ) as Array<{ title: string; source: string; summary: string }>;

    const recentNews = articles.map(a => `- ${a.title} (${a.source})`).join('\n');

    const prompt = `Você é o MiroFish, um motor de predição financeira por inteligência de enxame multi-agente.

CENÁRIO: ${scenario}
${tickers?.length ? `TICKERS: ${tickers.join(', ')}` : ''}
${context ? `CONTEXTO: ${context}` : ''}
${market_data ? `DADOS DE MERCADO: ${market_data}` : ''}

NOTÍCIAS RECENTES:
${recentNews}

Simule um debate entre ${p.agent_count} agentes financeiros diversos (investidores institucionais, traders, economistas, analistas quant, gestores de risco, especialistas setoriais, analistas técnicos, analistas políticos).

O debate deve ter ${p.max_rounds} rounds onde agentes debatem, desafiam posições e convergem gradualmente.

Retorne JSON:
{
  "simulation_id": "sim_${Date.now()}",
  "scenario": "${scenario.replace(/"/g, '\\"')}",
  "status": "completed",
  "preset": "${preset || 'standard'}",
  "duration_seconds": 0,
  "agents": [
    {"id": "agent_01", "archetype": "tipo", "name": "Nome PT-BR", "bias": "bullish|bearish|neutral", "confidence": 0.0-1.0, "reasoning": "Razão em PT-BR"}
  ],
  "rounds": [
    {"round": 1, "consensus_direction": "bullish|bearish|neutral", "consensus_strength": 0.0-1.0, "key_tension": "Tensão principal em PT-BR", "interactions": []}
  ],
  "report": {
    "prediction": {
      "direction": "bullish|bearish|neutral",
      "confidence": 0.0-1.0,
      "probability_up": 0.0-1.0,
      "probability_down": 0.0-1.0,
      "probability_neutral": 0.0-1.0,
      "time_horizon": "curto prazo (1-5 dias)|médio prazo (1-4 semanas)|longo prazo (1-3 meses)",
      "expected_magnitude": "low (<1%)|moderate (1-3%)|high (3-5%)|extreme (>5%)"
    },
    "key_factors": ["fator1", "fator2", "fator3"],
    "risk_factors": ["risco1", "risco2"],
    "dissenting_views": ["visão1"],
    "executive_summary": "2-3 parágrafos em PT-BR",
    "actionable_insight": "Recomendação acionável em 1 frase PT-BR",
    "consensus_trajectory": [{"round": 1, "direction": "...", "strength": 0.0-1.0}]
  }
}

IMPORTANTE: Tudo em Português. Mercado brasileiro. Seja específico com tickers B3 quando relevante.`;

    const result = await geminiGenerate(prompt, { temperature: 0.5, maxTokens: 8192, json: true });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data, { status: 202 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET: list simulations or presets
export async function GET(req: NextRequest) {
  try {
    const presets = req.nextUrl.searchParams.get('presets');

    if (presets === 'true') {
      return NextResponse.json(PRESETS);
    }

    // Return empty simulation list (stateless serverless mode)
    return NextResponse.json([]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
