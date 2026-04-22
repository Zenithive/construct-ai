/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import type { UserRow } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    const user = await queryOne<UserRow>(
      'SELECT id, email, "firstName", "lastName", is_verified, created_at FROM users WHERE id = $1',
      [authUser.userId]
    );
    if (!user) return err('User not found.', 404);
    return ok({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isVerified: user.is_verified, createdAt: user.created_at } });
  } catch (e) {
    console.error('[GET /api/auth/me]', e);
    return err('Internal server error.', 500);
  }
}
