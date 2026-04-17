import { engineRequest } from '@/lib/engine';
import { NextRequest, NextResponse } from 'next/server';

// POST: start simulation via MiroFish engine
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenario, tickers, context, market_data, preset, config } = body;

    if (!scenario) {
      return NextResponse.json({ error: 'scenario required' }, { status: 400 });
    }

    const result = await engineRequest('/api/simulate', {
      method: 'POST',
      body: JSON.stringify({
        scenario,
        tickers: tickers || [],
        context: context || '',
        market_data: market_data || '',
        preset: preset || 'standard',
        config: config || {},
      }),
    });

    return NextResponse.json(result, { status: 202 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET: get simulation by id, list all, or get presets
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const presets = req.nextUrl.searchParams.get('presets');

    if (presets === 'true') {
      const result = await engineRequest('/api/presets');
      return NextResponse.json(result);
    }

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
