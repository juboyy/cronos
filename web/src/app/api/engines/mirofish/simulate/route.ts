import { NextRequest, NextResponse } from 'next/server';
import { geminiGenerate } from '@/lib/gemini';
import { supabaseQuery } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET: list simulations (empty for now — stateless serverless)
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || 'list';

  if (action === 'list') {
    return NextResponse.json({ count: 0, simulations: [] });
  }

  return NextResponse.json({ error: `Action "${action}" not implemented in serverless mode` }, { status: 400 });
}

// POST: run a simulation using Gemini swarm logic
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = body.topic || body.scenario || '';
    const context = body.context || '';

    if (!topic.trim()) {
      return NextResponse.json({ error: 'Tópico/cenário é obrigatório' }, { status: 400 });
    }

    // Fetch recent market data for grounding
    const [articles, entities] = await Promise.all([
      supabaseQuery('cronos_articles', 'select=title,source,summary,published_at&order=published_at.desc&limit=15') as Promise<Array<{ title: string; source: string; summary: string; published_at: string }>>,
      supabaseQuery('cronos_entities', 'select=canonical_name,type,sector&limit=20') as Promise<Array<{ canonical_name: string; type: string; sector: string }>>,
    ]);

    const recentNews = articles.map(a => `- ${a.title} (${a.source})`).join('\n');
    const topEntities = entities.map(e => `${e.canonical_name} (${e.type})`).join(', ');

    const prompt = `Você é o MiroFish, um motor de predição financeira por inteligência de enxame.

Execute uma simulação multi-agente sobre o seguinte cenário:

CENÁRIO: ${topic}

${context ? `CONTEXTO ADICIONAL:\n${context}\n` : ''}

NOTÍCIAS RECENTES DO MERCADO BRASILEIRO:
${recentNews}

ENTIDADES MAIS RELEVANTES: ${topEntities}

Simule um debate entre 8 agentes financeiros com diferentes perfis:
1. Investidor Institucional (conservador)
2. Trader Varejo (agressivo)
3. Analista Quantitativo (dados)
4. Economista Macro (juros, câmbio)
5. Especialista Setorial
6. Gestor de Risco
7. Analista Técnico (gráficos)
8. Analista Político (regulação)

Cada agente deve debater 3 rounds, atualizando posições. Depois gere o relatório final.

Retorne JSON:
{
  "simulation_id": "sim_serverless_${Date.now()}",
  "status": "completed",
  "scenario": "${topic.replace(/"/g, '\\"')}",
  "config": { "agents": 8, "rounds": 3, "model": "gemini-2.0-flash" },
  "agents": [
    { "id": "agent_01", "name": "Nome", "archetype": "tipo", "final_bias": "bullish|bearish|neutral", "confidence": 0.0-1.0, "key_argument": "..." }
  ],
  "rounds": [
    { "round": 1, "consensus_direction": "...", "consensus_strength": 0.0-1.0, "key_tension": "..." }
  ],
  "prediction": {
    "direction": "bullish|bearish|neutral",
    "confidence": 0.0-1.0,
    "probability_up": 0.0-1.0,
    "probability_down": 0.0-1.0,
    "time_horizon": "curto prazo (1-5 dias)",
    "expected_magnitude": "low|moderate|high|extreme"
  },
  "key_factors": ["fator1", "fator2", "fator3"],
  "risk_factors": ["risco1", "risco2"],
  "executive_summary": "2-3 parágrafos em português com a síntese executiva",
  "actionable_insight": "Recomendação acionável em 1 frase"
}

IMPORTANTE: Tudo em Português. Perspectiva do mercado brasileiro. Seja específico com tickers B3.`;

    const result = await geminiGenerate(prompt, {
      temperature: 0.5,
      maxTokens: 8192,
      json: true,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, result: `Erro na simulação: ${result.error}` }, { status: 500 });
    }

    const simData = result.data as Record<string, unknown>;

    // Format a readable result string for the UI
    const pred = simData.prediction as Record<string, unknown> | undefined;
    const summary = simData.executive_summary || '';
    const insight = simData.actionable_insight || '';
    const readable = [
      `🦈 SIMULAÇÃO MIROFISH — RESULTADO`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `CENÁRIO: ${topic}`,
      ``,
      `PREDIÇÃO: ${(pred?.direction as string || 'N/A').toUpperCase()} (confiança: ${Math.round((pred?.confidence as number || 0) * 100)}%)`,
      `Probabilidade Alta: ${Math.round((pred?.probability_up as number || 0) * 100)}%`,
      `Probabilidade Queda: ${Math.round((pred?.probability_down as number || 0) * 100)}%`,
      `Horizonte: ${pred?.time_horizon || 'N/A'}`,
      `Magnitude: ${pred?.expected_magnitude || 'N/A'}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `SUMÁRIO EXECUTIVO:`,
      String(summary),
      ``,
      `💡 INSIGHT: ${insight}`,
      ``,
      `FATORES-CHAVE: ${(simData.key_factors as string[] || []).join(', ')}`,
      `RISCOS: ${(simData.risk_factors as string[] || []).join(', ')}`,
    ].join('\n');

    return NextResponse.json({ ...simData, result: readable });
  } catch (e) {
    return NextResponse.json({ error: String(e), result: `Erro: ${e}` }, { status: 500 });
  }
}
