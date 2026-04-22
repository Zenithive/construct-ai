/**
 * POST /api/auth/logout
 * JWT is stateless — client discards the token.
 */
import { NextRequest } from 'next/server';
import { ok } from '@/lib/helpers';

export async function POST(_req: NextRequest) {
  return ok({ message: 'Logged out successfully.' });
}
