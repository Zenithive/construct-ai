/**
 * middleware.ts
 * Protects /dashboard and all /api/* routes (except public auth endpoints).
 * Runs on the Next.js Edge Runtime.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

// API routes that don't need a token
const PUBLIC_API_ROUTES = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/otp/send',
  '/api/otp/verify',
];

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // ── Protect /dashboard (redirect to login if no token) ────────────────────
  if (pathname.startsWith('/dashboard')) {
    const token = req.cookies.get('token')?.value
      ?? req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    try {
      verifyToken(token);
    } catch {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // ── Protect /api/* routes ─────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    if (PUBLIC_API_ROUTES.some(r => pathname === r)) return NextResponse.next();

    const authHeader = req.headers.get('authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. Missing Bearer token.' }, { status: 401 });
    }
    try {
      verifyToken(authHeader.slice(7).trim());
      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: 'Unauthorized. Invalid or expired token.' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
