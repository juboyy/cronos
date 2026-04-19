import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100);

  try {
    const articles = await supabaseQuery(
      'cronos_articles',
      `select=id,title,source,summary,published_at,url,cronos_sentiment(score,label)&order=published_at.desc.nullslast&limit=${limit}&offset=${offset}`
    );

    // Get total count
    const countRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL}/rest/v1/cronos_articles?select=id&head=true`,
      {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
          'Prefer': 'count=exact',
        },
      }
    );
    const total = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10);

    return NextResponse.json({ articles, total, offset, limit });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
