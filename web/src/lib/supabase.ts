const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://apkflemxmsbdltziouls.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function supabaseQuery(table: string, params: string = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

/**
 * Standardize API response for Cronos endpoints.
 */
export function cronosResponse(data: unknown, status: number = 200) {
  const { NextResponse } = require('next/server');
  if (data instanceof Error) {
    return NextResponse.json({ error: data.message }, { status: 500 });
  }
  return NextResponse.json(data, { status });
}

export { SUPABASE_URL, SUPABASE_KEY };
