import { engineRequest } from '@/lib/engine';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/cronos/opinion — BettaFish article analysis
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, entities, market_context } = body;

    if (!title) {
      return NextResponse.json({ error: 'title required' }, { status: 400 });
    }

    const result = await engineRequest('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({
        title,
        content: content || '',
        entities: entities || [],
        market_context: market_context || '',
      }),
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
