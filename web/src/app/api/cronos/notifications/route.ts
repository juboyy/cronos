import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET: list notifications (unread first, last 30)
// PATCH: mark read
export async function GET(req: NextRequest) {
  const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true';
  const limit = req.nextUrl.searchParams.get('limit') || '30';
  
  let query = `select=*&order=read.asc,created_at.desc&limit=${limit}`;
  if (unreadOnly) query += '&read=eq.false';

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cronos_notifications?${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    next: { revalidate: 0 }, // no cache for notifications
  });
  return NextResponse.json(await res.json());
}

// POST: create notification (used by alert engine and crawler)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, title, body: notifBody, severity, ticker, article_id, alert_id, metadata } = body;

  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cronos_notifications`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      type: type || 'alert',
      title,
      body: notifBody || null,
      severity: severity || 'info',
      ticker: ticker || null,
      article_id: article_id || null,
      alert_id: alert_id || null,
      metadata: metadata || {},
    }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}

// PATCH: mark notifications as read
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { ids, all } = body;

  let filter = '';
  if (all) {
    filter = 'read=eq.false';
  } else if (ids?.length) {
    filter = `id=in.(${ids.join(',')})`;
  } else {
    return NextResponse.json({ error: 'ids[] or all:true required' }, { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cronos_notifications?${filter}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ read: true }),
  });

  return NextResponse.json({ updated: true }, { status: res.ok ? 200 : 500 });
}
