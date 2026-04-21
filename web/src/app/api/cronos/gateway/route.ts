import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';

// Rate limiting (in-memory, reset on cold start)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// Unified Cronos API gateway for Paganini agents
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  // Rate limit: 60 requests per minute per IP
  if (!checkRateLimit(`cronos:${ip}`, 60, 60000)) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Max 60/min.', retry_after: 60 },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { action, params } = body;

    if (!action) {
      return NextResponse.json({ error: 'action required' }, { status: 400 });
    }

    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    // Route actions to internal APIs
    const routes: Record<string, { path: string; method: string }> = {
      briefing: { path: '/api/cronos/briefing', method: 'GET' },
      feed: { path: '/api/feed', method: 'GET' },
      search: { path: '/api/cronos/search', method: 'GET' },
      impact: { path: '/api/cronos/impact', method: 'GET' },
      prices: { path: '/api/cronos/prices', method: 'GET' },
      patterns: { path: '/api/cronos/patterns', method: 'GET' },
      simulate: { path: '/api/cronos/simulate', method: 'POST' },
      alerts: { path: '/api/cronos/alerts', method: 'GET' },
      entity: { path: `/api/entity/${params?.id || ''}`, method: 'GET' },
    };

    const route = routes[action];
    if (!route) {
      return NextResponse.json(
        { error: 'unknown_action', available: Object.keys(routes) },
        { status: 400 }
      );
    }

    // Build URL with query params for GET
    let url = `${baseUrl}${route.path}`;
    if (route.method === 'GET' && params) {
      const qs = new URLSearchParams(params).toString();
      if (qs) url += `?${qs}`;
    }

    const fetchOptions: RequestInit = {
      method: route.method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (route.method === 'POST' && params) {
      fetchOptions.body = JSON.stringify(params);
    }

    const res = await fetch(url, fetchOptions);
    const data = await res.json();

    return NextResponse.json({
      action,
      status: res.ok ? 'success' : 'error',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: 'internal_error', message: (e as Error).message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  try {
    // Quick DB ping
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/cronos_articles?select=id&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );

    return NextResponse.json({
      status: 'healthy',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      database: res.ok ? 'connected' : 'error',
      endpoints: [
        'briefing', 'feed', 'search', 'impact', 'prices',
        'patterns', 'simulate', 'alerts', 'entity',
      ],
    });
  } catch {
    return NextResponse.json({ status: 'degraded', timestamp: new Date().toISOString() }, { status: 503 });
  }
}
