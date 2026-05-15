/**
 * PATCH /api/users/country
 * Body: { country: string }
 * Updates the authenticated user's country.
 */
import { NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import type { UserRow } from '@/types';

export async function PATCH(req: NextRequest) {
  try {
    const authUser = requireAuth(req);

    const body = await req.json().catch(() => null);
    const { country } = body ?? {};

    if (!country || typeof country !== 'string' || !country.trim()) {
      return err('country is required and must be a non-empty string.');
    }

    const updated = await queryOne<Pick<UserRow, 'id' | 'country'>>(
      `UPDATE users
          SET country = $1
        WHERE id = $2
        RETURNING id, country`,
      [country.trim(), authUser.userId]
    );

    if (!updated) return err('User not found.', 404);

    return ok({ message: 'Country updated.', country: updated.country });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    console.error('[PATCH /api/users/country]', e);
    return err('Internal server error.', 500);
  }
}
