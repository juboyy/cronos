import { NextRequest, NextResponse } from 'next/server';

// Auth disabled for now — open access during data-fill phase
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
