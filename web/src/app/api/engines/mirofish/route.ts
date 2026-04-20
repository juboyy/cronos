import { NextResponse } from 'next/server';

const MIROFISH_BACKEND = 'https://mirofish-api.216-238-124-248.nip.io';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [healthRes, simRes] = await Promise.all([
      fetch(`${MIROFISH_BACKEND}/health`, {
        signal: AbortSignal.timeout(5000),
        // @ts-expect-error Node.js fetch option
        rejectUnauthorized: false,
      }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${MIROFISH_BACKEND}/api/simulation/list`, {
        signal: AbortSignal.timeout(5000),
        // @ts-expect-error Node.js fetch option
        rejectUnauthorized: false,
      }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    return NextResponse.json({
      backend: healthRes ? 'online' : 'offline',
      simulations: simRes?.count ?? 0,
      service: healthRes?.service ?? null,
    });
  } catch {
    return NextResponse.json({ backend: 'offline', simulations: 0 });
  }
}
