import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    backend: 'online',
    simulations: 0,
    service: {
      name: 'MiroFish',
      version: '2.0.0-serverless',
      model: 'gemini-2.0-flash',
      mode: 'swarm-prediction',
    },
  });
}
