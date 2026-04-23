import { NextRequest, NextResponse } from 'next/server';
import { geminiGenerate } from '@/lib/gemini';
import { supabaseQuery } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * MiroFish: Swarm Prediction Engine (Multi-Agent Debate)
 * Pipeline: 
 * 1. Generate Agent Profiles
 * 2. Sequential Debate Rounds (3 rounds)
 * 3. Synthesis Report
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = body.topic || body.scenario || '';
    const context = body.context || '';

    if (!topic.trim()) {
      return NextResponse.json({ error: 'Tópico/cenário é obrigatório' }, { status: 400 });
    }

    // Fetch recent market data for grounding
    const articles = await supabaseQuery(
      'cronos_articles', 
      'select=title,source,summary,published_at&order=published_at.desc&limit=15'
    ) as Array<{ title: string; source: string; summary: string; published_at: string }>;

    const marketContext = articles.map(a => `- ${a.title} (${a.source}): ${a.summary?.slice(0, 150)}...`).join('\n');

    // STEP 1: Generate Agent Profiles
    const profilePrompt = `Você é um coordenador de inteligência de enxame (MiroFish).
Crie 6 perfis de agentes financeiros diversos para debater o cenário: "${topic}"
Contexto adicional: ${context}
Mercado Recente:
${marketContext}

Os arquétipos obrigatórios são:
- institutional_investor (conservador, foco em fundamentos)
- quantitative_analyst (baseado em dados, modelos estatísticos)
- macro_economist (juros, câmbio, fiscal, IPCA)
- technical_analyst (gráficos, momentum, suporte/resistência)
- risk_manager (foco em proteção, cenários de cauda)
- sector_specialist (especialista no setor mais afetado pelo tópico)

Para cada agente, defina: nome, arquétipo, bias inicial (bullish/bearish/neutral), confiança inicial (0-1) e uma breve tese inicial.

Retorne JSON:
{
  "agents": [
    { "id": "A1", "name": "...", "archetype": "...", "bias": "...", "confidence": 0.8, "initial_thesis": "..." }
  ]
}
Tudo em Português (PT-BR).`;

    const profileRes = await geminiGenerate(profilePrompt, { temperature: 0.5, json: true });
    if (!profileRes.ok) throw new Error(`Erro ao gerar perfis: ${profileRes.error}`);
    
    let agents = (profileRes.data as any).agents;
    const rounds: any[] = [];
    let currentConsensus = 0;

    // STEP 2: Debate Rounds (Sequential)
    for (let r = 1; r <= 3; r++) {
      const debatePrompt = `ROUND DE DEBATE ${r}/3
Cenário: ${topic}
Agentes e Posições Atuais:
${JSON.stringify(agents, null, 2)}

Anteriormente neste debate:
${JSON.stringify(rounds, null, 2)}

Instruções:
Simule a interação entre esses agentes. Eles devem ler as teses uns dos outros, concordar, discordar ou desafiar com dados.
Após a interação, atualize o estado de cada agente (bias e confiança) e a nova tese (argumento atualizado).
Avalie a força do consenso geral (0 a 1).

Retorne JSON:
{
  "round_summary": {
    "round": ${r},
    "key_tension": "O principal ponto de discordância",
    "consensus_strength": 0.0,
    "dominant_direction": "bullish|bearish|neutral"
  },
  "updated_agents": [
     // Lista completa dos 6 agentes com campos: id, name, archetype, bias, confidence, updated_argument
  ]
}
Tudo em Português. Mercado Brasileiro (B3, Selic, etc).`;

      const roundRes = await geminiGenerate(debatePrompt, { temperature: 0.6, json: true });
      if (roundRes.ok) {
        const data = roundRes.data as any;
        rounds.push(data.round_summary);
        agents = data.updated_agents;
        currentConsensus = data.round_summary.consensus_strength;
        
        if (currentConsensus > 0.75) break; // Early exit on strong consensus
      }
    }

    // STEP 3: Final Prediction & Synthesis
    const synthesisPrompt = `SÍNTESE FINAL MIROFISH
Cenário: ${topic}
Histórico do Debate:
${JSON.stringify(rounds, null, 2)}
Estado Final dos Agentes:
${JSON.stringify(agents, null, 2)}

Gere um relatório estruturado de predição.
Retorne JSON:
{
  "prediction": {
    "direction": "bullish|bearish|neutral",
    "confidence": 0.0,
    "probability_up": 0.0,
    "probability_down": 0.0,
    "time_horizon": "ex: 1-5 dias ou 1 mês",
    "expected_magnitude": "low|moderate|high|extreme"
  },
  "key_factors": ["fator 1", "fator 2", "fator 3"],
  "risk_factors": ["risco 1", "risco 2"],
  "executive_summary": "2-3 parágrafos robustos em PT-BR",
  "actionable_insight": "Uma recomendação clara e direta"
}
Tudo em Português. Foco em B3 e ativos brasileiros.`;

    const finalRes = await geminiGenerate(synthesisPrompt, { temperature: 0.3, json: true });
    if (!finalRes.ok) throw new Error(`Erro na síntese final: ${finalRes.error}`);
    
    const finalData = finalRes.data as any;

    // Prepare response
    const responseData = {
      simulation_id: `sim_mf_${Date.now()}`,
      status: 'completed',
      topic,
      agents,
      rounds,
      ...finalData,
    };

    // Format readable text for backward compatibility
    const pred = responseData.prediction;
    const readable = [
      `🦈 SIMULAÇÃO MIROFISH — RESULTADO`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `CENÁRIO: ${topic}`,
      ``,
      `PREDIÇÃO: ${(pred?.direction || 'N/A').toUpperCase()} (confiança: ${Math.round((pred?.confidence || 0) * 100)}%)`,
      `Probabilidade Alta: ${Math.round((pred?.probability_up || 0) * 100)}%`,
      `Probabilidade Queda: ${Math.round((pred?.probability_down || 0) * 100)}%`,
      `Horizonte: ${pred?.time_horizon || 'N/A'}`,
      `Magnitude: ${pred?.expected_magnitude || 'N/A'}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `SUMÁRIO EXECUTIVO:`,
      String(responseData.executive_summary || ''),
      ``,
      `💡 INSIGHT: ${responseData.actionable_insight || ''}`,
      ``,
      `FATORES-CHAVE: ${(responseData.key_factors || []).join(', ')}`,
      `RISCOS: ${(responseData.risk_factors || []).join(', ')}`,
    ].join('\n');

    return NextResponse.json({ ...responseData, result: readable });

  } catch (e) {
    console.error('MiroFish Error:', e);
    return NextResponse.json({ 
      error: String(e), 
      result: `Erro na simulação MiroFish: ${e}. Tente novamente.` 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ status: 'active', engine: 'MiroFish Swarm' });
}
