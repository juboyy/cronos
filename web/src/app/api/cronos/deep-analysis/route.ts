import { engineRequest } from '@/lib/engine';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/cronos/deep-analysis — BettaFish multi-article synthesis
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, articles, market_data } = body;

    if (!topic || !articles?.length) {
      return NextResponse.json({ error: 'topic and articles[] required' }, { status: 400 });
    }

    const result = await engineRequest('/api/deep-analysis', {
      method: 'POST',
      body: JSON.stringify({
        topic,
        articles,
        market_data: market_data || '',
      }),
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
