import { NextRequest, NextResponse } from 'next/server';

const GEMINI_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const BETTAFISH_PROMPT = `Você é BettaFish, um analista financeiro combativo e direto que entrega opiniões afiadas sobre o mercado brasileiro.

REGRAS:
1. Sempre apresente dois lados: 🐂 BULL (cenário otimista) e 🐻 BEAR (cenário pessimista)
2. Cada lado deve ter 2-3 argumentos concretos com dados/referências quando possível
3. Termine com um VEREDITO claro: COMPRA, VENDA, ou NEUTRO com uma frase de convicção
4. Use linguagem direta, sem corporativismo. Pode ser provocativo mas fundamentado
5. Mencione riscos específicos (macro, setorial, regulatório)
6. Se houver ticker, mencione múltiplos (P/E, EV/EBITDA) quando relevante
7. Máximo 300 palavras total

Contexto de mercado fornecido: {market_context}

Analise o seguinte:
Título: {title}
{content_section}
{entities_section}

Responda em JSON com: { "bull": "...", "bear": "...", "verdict": "COMPRA|VENDA|NEUTRO", "conviction": "...", "risk_level": "BAIXO|MEDIO|ALTO" }`;

// Normalize engine response (array of perspectives) to unified format
function normalizeEngineResponse(data: any) {
  const perspectives = data.perspectives || [];
  const synthesis = data.synthesis || {};

  // Map engine roles to display labels
  const mapped: Record<string, { analysis: string; confidence: number; stance: string; tickers: string[] }> = {};
  for (const p of perspectives) {
    const key = p.role?.replace('_analyst', '').replace('_economist', '').replace('_specialist', '').replace('_assessor', '') || p.label;
    mapped[key] = {
      analysis: p.analysis || '',
      confidence: p.confidence || 0,
      stance: p.stance || 'neutral',
      tickers: p.affected_tickers || [],
    };
  }

  return {
    perspectives: mapped,
    synthesis: {
      sentiment: synthesis.overall_sentiment || 'neutral',
      action: synthesis.recommended_action || '',
      takeaway: synthesis.key_takeaway || '',
      risk: synthesis.risk_level || 'medium',
      confidence: synthesis.confidence || 0,
    },
    source: 'engine',
    model: 'bettafish-v2',
    analysis_id: data.analysis_id,
  };
}

// Normalize Gemini response to same format
function normalizeGeminiResponse(parsed: any) {
  return {
    perspectives: {
      bull: { analysis: parsed.bull || '', confidence: 0.7, stance: 'bullish', tickers: [] },
      bear: { analysis: parsed.bear || '', confidence: 0.7, stance: 'bearish', tickers: [] },
    },
    synthesis: {
      sentiment: parsed.verdict === 'COMPRA' ? 'positive' : parsed.verdict === 'VENDA' ? 'negative' : 'neutral',
      action: parsed.verdict || 'NEUTRO',
      takeaway: parsed.conviction || '',
      risk: parsed.risk_level?.toLowerCase() || 'medium',
      confidence: 0.6,
    },
    source: 'gemini-flash',
    model: 'bettafish-v2',
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, entities, market_context } = body;

    if (!title) {
      return NextResponse.json({ error: 'title required' }, { status: 400 });
    }

    // Try engine first (Vultr)
    const engineUrl = process.env.CRONOS_ENGINE_URL || 'http://216.238.124.248:5050';
    try {
      const engineRes = await fetch(`${engineUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: content || '', entities: entities || [], market_context: market_context || '' }),
        signal: AbortSignal.timeout(15000),
      });
      if (engineRes.ok) {
        const raw = await engineRes.json();
        return NextResponse.json(normalizeEngineResponse(raw));
      }
    } catch {
      // Engine unavailable, fall through to Gemini
    }

    // Fallback: Gemini
    if (!GEMINI_KEY) {
      return NextResponse.json({ error: 'No API key configured for analysis' }, { status: 503 });
    }

    const prompt = BETTAFISH_PROMPT
      .replace('{title}', title)
      .replace('{content_section}', content ? `Conteúdo: ${content.slice(0, 1000)}` : '')
      .replace('{entities_section}', entities?.length ? `Entidades: ${entities.join(', ')}` : '')
      .replace('{market_context}', market_context || 'Nenhum contexto adicional');

    const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
      }),
    });

    if (!geminiRes.ok) {
      return NextResponse.json({ error: `Gemini error: ${geminiRes.status}` }, { status: 502 });
    }

    const data = await geminiRes.json();
    let textResp = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    textResp = textResp.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(textResp);
      return NextResponse.json(normalizeGeminiResponse(parsed));
    } catch {
      return NextResponse.json({
        perspectives: {
          bull: { analysis: textResp, confidence: 0.3, stance: 'neutral', tickers: [] },
        },
        synthesis: { sentiment: 'neutral', action: 'NEUTRO', takeaway: 'Análise em formato livre', risk: 'medium', confidence: 0.3 },
        source: 'gemini-flash',
        model: 'bettafish-v2',
        raw: true,
      });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
