import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Self-contained BettaFish status — no external backend needed
export async function GET() {
  return NextResponse.json({
    backend: 'online',
    started: true,
    engines: {
      insight: { status: 'active', model: 'gemini-2.0-flash' },
      media: { status: 'active', model: 'gemini-2.0-flash' },
      query: { status: 'active', model: 'gemini-2.0-flash' },
      forum: { status: 'active', model: 'gemini-2.0-flash' },
    },
  });
}

export async function POST() {
  return NextResponse.json({ success: true, message: 'Engine já está ativo (serverless).' });
}
