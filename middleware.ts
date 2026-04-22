/**
 * middleware.ts
 * Protects /dashboard and all /api/* routes (except public auth endpoints).
 * Uses Web Crypto API — compatible with Next.js Edge Runtime.
 */
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_API_ROUTES = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/otp/send',
  '/api/otp/verify',
];

// Verify JWT using Web Crypto (Edge-compatible, no jsonwebtoken needed)
async function verifyJWT(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = encoder.encode(`${parts[0]}.${parts[1]}`);
    const signature = Uint8Array.from(
      atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!valid) return false;

    // Check expiry
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false;

    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const secret = process.env.JWT_SECRET ?? '';

  // ── Protect /dashboard ────────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    const token = req.cookies.get('token')?.value
      ?? req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token || !(await verifyJWT(token, secret))) {
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

    const token = authHeader.slice(7).trim();
    if (!(await verifyJWT(token, secret))) {
      return NextResponse.json({ error: 'Unauthorized. Invalid or expired token.' }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
