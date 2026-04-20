import { NextResponse } from 'next/server';

const BETTAFISH_BACKEND = 'https://bettafish.216-238-124-248.nip.io';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(`${BETTAFISH_BACKEND}/api/graph/latest`, {
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ success: false, message: 'Conexão falhou' });
  }
}
