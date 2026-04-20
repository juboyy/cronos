import { NextResponse } from 'next/server';

const BETTAFISH_BACKEND = 'https://bettafish.216-238-124-248.nip.io';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(`${BETTAFISH_BACKEND}/api/forum/log`, {
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return NextResponse.json({ lines: data.log_lines ?? [], messages: data.parsed_messages ?? [] });
  } catch {
    return NextResponse.json({ lines: [], messages: [] });
  }
}
