/**
 * GET /api/users
 * Returns the authenticated user's profile.
 *
 * PATCH /api/users
 * Body: { firstName?, lastName? }
 * Updates the authenticated user's profile.
 */
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
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
    console.error('[GET /api/users]', e);
    return err('Internal server error.', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    const body = await req.json();
    const { firstName, lastName } = body ?? {};

    if (!firstName && !lastName) return err('Provide at least firstName or lastName to update.');

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (firstName) { updates.push(`"firstName" = $${idx++}`); values.push(firstName.trim()); }
    if (lastName)  { updates.push(`"lastName" = $${idx++}`);  values.push(lastName.trim()); }
    values.push(authUser.userId);

    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, values);
    return ok({ message: 'Profile updated.' });
  } catch (e) {
    console.error('[PATCH /api/users]', e);
    return err('Internal server error.', 500);
  }
}
