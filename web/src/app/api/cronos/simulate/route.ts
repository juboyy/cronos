import { engineRequest } from '@/lib/engine';
import { NextRequest, NextResponse } from 'next/server';

// POST: start simulation via MiroFish engine
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenario, tickers, context, agent_count, max_rounds, market_data } = body;

    if (!scenario) {
      return NextResponse.json({ error: 'scenario required' }, { status: 400 });
    }

    const result = await engineRequest('/api/simulate', {
      method: 'POST',
      body: JSON.stringify({
        scenario,
        tickers: tickers || [],
        context: context || '',
        agent_count: agent_count || 12,
        max_rounds: max_rounds || 8,
        market_data: market_data || '',
      }),
    });

    return NextResponse.json(result, { status: 202 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET: get simulation by id or list all
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');

    if (id) {
      const result = await engineRequest(`/api/simulate/${id}`);
      return NextResponse.json(result);
    }

    const result = await engineRequest('/api/simulations');
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
