import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET: list alerts | POST: create alert
export async function GET() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cronos_alerts?select=*&order=created_at.desc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    next: { revalidate: 30 },
  });
  return NextResponse.json(await res.json());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, type, conditions, channels } = body;

  if (!name || !type || !conditions) {
    return NextResponse.json({ error: 'name, type, conditions required' }, { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cronos_alerts`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      name,
      type,
      conditions,
      channels: channels || ['dashboard'],
      active: true,
    }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}
