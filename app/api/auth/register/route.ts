/**
 * POST /api/auth/register
 * Body: { email, password, firstName, lastName }
 * Returns: { token, user }
 */
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, signToken } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { ok, err, isValidEmail, isStrongPassword } from '@/lib/helpers';
import type { UserRow } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName } = body ?? {};

    if (!email || !password || !firstName || !lastName)
      return err('email, password, firstName and lastName are required.');
    if (!isValidEmail(email)) return err('Invalid email address.');
    if (!isStrongPassword(password)) return err('Password must be at least 6 characters.');

    const existing = await queryOne<UserRow>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing) return err('An account with this email already exists.', 409);

    const id = uuidv4();
    const passwordHash = await hashPassword(password);

    const user = await queryOne<UserRow>(
      `INSERT INTO users (id, email, password, "firstName", "lastName", is_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, false, NOW())
       RETURNING id, email, "firstName", "lastName", is_verified`,
      [id, email.toLowerCase(), passwordHash, firstName.trim(), lastName.trim()]
    );

    if (!user) return err('Failed to create account.', 500);

    const token = signToken({ userId: user.id, email: user.email });
    return ok({ token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isVerified: user.is_verified } }, 201);
  } catch (e) {
    console.error('[POST /api/auth/register]', e);
    return err('Internal server error.', 500);
  }
}
