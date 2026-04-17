import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// POST: start simulation | GET: list simulations
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenario, tickers, config } = body;

    if (!scenario) {
      return NextResponse.json({ error: 'scenario required' }, { status: 400 });
    }

    const simId = crypto.randomUUID();
    
    // Create pending record
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/cronos_simulations`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        id: simId,
        scenario,
        tickers: tickers || [],
        config: config || {},
        status: 'pending',
      }),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    // Trigger simulation async (fire-and-forget to Python backend)
    // In production this would be a queue; for now we return pending
    // and the Python adapter processes it via cron or webhook
    
    return NextResponse.json({
      simulation_id: simId,
      status: 'pending',
      message: 'Simulation queued. Poll GET /api/cronos/simulate?id=<id> for results.',
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const limit = req.nextUrl.searchParams.get('limit') || '10';

  let query = 'select=*&order=created_at.desc';
  if (id) {
    query = `id=eq.${id}&select=*`;
  } else {
    query += `&limit=${limit}`;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cronos_simulations?${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    next: { revalidate: 10 },
  });

  const data = await res.json();
  return NextResponse.json(id ? data[0] || null : data);
}
