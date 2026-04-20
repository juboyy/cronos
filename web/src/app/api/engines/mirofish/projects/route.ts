import { NextResponse } from 'next/server';

const MIROFISH_BACKEND = 'https://mirofish-api.216-238-124-248.nip.io';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(`${MIROFISH_BACKEND}/api/graph/project/list`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json({ projects: [] });
    }
    const data = await res.json();
    return NextResponse.json({ projects: data.data ?? data.projects ?? [] });
  } catch {
    return NextResponse.json({ projects: [] });
  }
}
