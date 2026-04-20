import { NextResponse } from 'next/server';

const BETTAFISH_BACKEND = 'https://bettafish.216-238-124-248.nip.io';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    const res = await fetch(`${BETTAFISH_BACKEND}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ results: {}, error: 'Conexão falhou' });
  }
}
