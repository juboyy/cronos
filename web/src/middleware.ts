import { NextRequest, NextResponse } from 'next/server';
import { NextResponse as NR } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/cronos/gateway', '/api/auth'];
const PUBLIC_PREFIXES = ['/api/auth/', '/_next/', '/favicon'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname)) return NR.next();
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NR.next();

  // Check for auth token in cookie
  const token = req.cookies.get('cronos_token')?.value;

  if (!token) {
    // API routes return 401, pages redirect to login
    if (pathname.startsWith('/api/')) {
      return NR.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NR.redirect(loginUrl);
  }

  return NR.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
