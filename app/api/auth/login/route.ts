/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, user }
 */
import { NextRequest } from 'next/server';
import { comparePassword, signToken } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { ok, err, isValidEmail } from '@/lib/helpers';
import type { UserRow } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};

    if (!email || !password) return err('email and password are required.');
    if (!isValidEmail(email)) return err('Invalid email address.');

    const user = await queryOne<UserRow>(
      'SELECT id, email, password, "firstName", "lastName", is_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (!user) return err('Invalid email or password.', 401);

    const match = await comparePassword(password, user.password);
    if (!match) return err('Invalid email or password.', 401);

    const token = signToken({ userId: user.id, email: user.email });
    return ok({ token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isVerified: user.is_verified } });
  } catch (e) {
    console.error('[POST /api/auth/login]', e);
    return err('Internal server error.', 500);
  }
}
