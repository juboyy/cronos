import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    engines: {
      insight: { status: 'active', model: 'gemini-2.0-flash', type: 'analysis' },
      media: { status: 'active', model: 'gemini-2.0-flash', type: 'media_monitoring' },
      query: { status: 'active', model: 'gemini-2.0-flash', type: 'query_engine' },
      forum: { status: 'active', model: 'gemini-2.0-flash', type: 'discussion' },
    },
    uptime: Math.floor(Date.now() / 1000),
    version: '2.0.0-serverless',
  });
}
