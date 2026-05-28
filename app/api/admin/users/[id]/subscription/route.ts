/**
 * PATCH /api/admin/users/[id]/subscription — update a user's plan (admin only)
 */
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireAdmin, AuthError, ForbiddenError } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import { currentMonthPeriod, resetUsageForPeriod } from '@/lib/billing';
import type { PlanCode, SubscriptionStatus, UserRow } from '@/types';

const VALID_PLANS: PlanCode[]              = ['free', 'pro', 'enterprise'];
const VALID_STATUSES: SubscriptionStatus[] = ['inactive', 'active', 'past_due', 'canceled'];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req, queryOne);

    const body = await req.json();
    const { planType, subscriptionStatus } = body ?? {};

    if (!planType || !VALID_PLANS.includes(planType))
      return err(`planType must be one of: ${VALID_PLANS.join(', ')}.`, 400);
    if (!subscriptionStatus || !VALID_STATUSES.includes(subscriptionStatus))
      return err(`subscriptionStatus must be one of: ${VALID_STATUSES.join(', ')}.`, 400);

    const targetUser = await queryOne<Pick<UserRow, 'id' | 'email' | 'plan_type'>>(
      'SELECT id, email, plan_type FROM users WHERE id = $1',
      [params.id]
    );
    if (!targetUser) return err('User not found.', 404);

    const { periodStart, periodEnd } = currentMonthPeriod();

    await query(
      `UPDATE users SET plan_type = $2, subscription_status = $3,
       current_period_start = $4, current_period_end = $5 WHERE id = $1`,
      [params.id, planType, subscriptionStatus, periodStart.toISOString(), periodEnd.toISOString()]
    );

    await query(
      `INSERT INTO subscriptions (id, user_id, plan_code, provider, provider_subscription_id,
       status, currency, started_at, expires_at, created_at)
       VALUES ($1, $2, $3, 'admin', NULL, $4, 'USD', $5, $6, NOW())`,
      [uuidv4(), params.id, planType, subscriptionStatus, periodStart.toISOString(), periodEnd.toISOString()]
    );

    await resetUsageForPeriod(params.id, periodStart, periodEnd);

    const updated = await queryOne<UserRow>(
      `SELECT id, email, "firstName", "lastName", plan_type, subscription_status,
              current_period_start, current_period_end, role FROM users WHERE id = $1`,
      [params.id]
    );

    return ok({
      message: 'Subscription updated successfully.',
      user: {
        id: updated!.id, email: updated!.email,
        firstName: updated!.firstName, lastName: updated!.lastName,
        planType: updated!.plan_type, subscriptionStatus: updated!.subscription_status,
        periodStart: updated!.current_period_start, periodEnd: updated!.current_period_end,
        role: updated!.role,
      },
    });
  } catch (e) {
    if (e instanceof AuthError)      return err(e.message, 401);
    if (e instanceof ForbiddenError) return err(e.message, 403);
    console.error('[PATCH /api/admin/users/[id]/subscription]', e);
    return err('Internal server error.', 500);
  }
}
