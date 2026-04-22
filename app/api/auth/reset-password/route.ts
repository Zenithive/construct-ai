/**
 * POST /api/auth/reset-password
 * Body: { newPassword }
 * Updates the authenticated user's password.
 */
import { NextRequest } from 'next/server';
import { requireAuth, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';
import { ok, err, isStrongPassword } from '@/lib/helpers';

export async function POST(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    const body = await req.json();
    const { newPassword } = body ?? {};

    if (!newPassword) return err('newPassword is required.');
    if (!isStrongPassword(newPassword)) return err('Password must be at least 6 characters.');

    const passwordHash = await hashPassword(newPassword);
    await query('UPDATE users SET password = $1 WHERE id = $2', [passwordHash, authUser.userId]);
    return ok({ message: 'Password updated successfully.' });
  } catch (e) {
    console.error('[POST /api/auth/reset-password]', e);
    return err('Internal server error.', 500);
  }
}
