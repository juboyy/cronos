import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password, action } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://apkflemxmsbdltziouls.supabase.co';
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  try {
    const endpoint = action === 'signup'
      ? `${SUPABASE_URL}/auth/v1/signup`
      : `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error_description || data.msg || 'Falha na autenticação' },
        { status: 401 }
      );
    }

    // Set httponly cookie with the access token
    const response = NextResponse.json({
      user: { id: data.user?.id, email: data.user?.email },
      message: action === 'signup' ? 'Conta criada. Verifique seu email.' : 'Login realizado.',
    });

    if (data.access_token) {
      response.cookies.set('cronos_token', data.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: data.expires_in || 3600,
      });
      response.cookies.set('cronos_refresh', data.refresh_token || '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ message: 'Logout realizado.' });
  response.cookies.delete('cronos_token');
  response.cookies.delete('cronos_refresh');
  return response;
}
