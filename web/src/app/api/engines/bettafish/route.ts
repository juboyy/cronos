import { NextResponse } from 'next/server';

const BETTAFISH_BACKEND = 'https://bettafish.216-238-124-248.nip.io';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [statusRes, configRes] = await Promise.all([
      fetch(`${BETTAFISH_BACKEND}/api/system/status`, {
        signal: AbortSignal.timeout(5000),
        // @ts-expect-error Node.js fetch option
        rejectUnauthorized: false,
      }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${BETTAFISH_BACKEND}/api/config`, {
        signal: AbortSignal.timeout(5000),
        // @ts-expect-error Node.js fetch option
        rejectUnauthorized: false,
      }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    return NextResponse.json({
      backend: statusRes ? 'online' : 'offline',
      started: statusRes?.started ?? false,
      engines: configRes?.config ? Object.keys(configRes.config)
        .filter(k => k.endsWith('_MODEL_NAME'))
        .map(k => k.replace('_MODEL_NAME', '').toLowerCase()) : [],
    });
  } catch {
    return NextResponse.json({ backend: 'offline', started: false, engines: [] });
  }
}

export async function POST() {
  try {
    const res = await fetch(`${BETTAFISH_BACKEND}/api/system/start`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      // @ts-expect-error Node.js fetch option
      rejectUnauthorized: false,
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ success: false, error: 'Connection failed' });
  }
}
