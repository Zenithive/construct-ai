/**
 * PATCH /api/admin/users/[id]/subscription
 * Admin-only. Update or remove a user's subscription plan.
 *
 * Body:
 *   planType           'free' | 'pro' | 'enterprise'
 *   subscriptionStatus 'inactive' | 'active' | 'past_due' | 'canceled'
 *
 * To remove/downgrade a subscription, pass planType = 'free' and subscriptionStatus = 'inactive'.
 */
import { NextRequest } from 'next/server';
import { requireAdmin, AuthError, ForbiddenError } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { updateUserPlan } from '@/lib/billing/subscriptions';
import { upsertSubscriptionRecord } from '@/lib/billing/subscriptions';
import { getCalendarMonthPeriod } from '@/lib/billing/period';
import { resetUsageForPeriod } from '@/lib/billing/usage';
import { ok, err } from '@/lib/helpers';
import type { PlanCode, SubscriptionStatus, UserRow } from '@/types';

const VALID_PLANS: PlanCode[]              = ['free', 'pro', 'enterprise'];
const VALID_STATUSES: SubscriptionStatus[] = ['inactive', 'active', 'past_due', 'canceled'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req, queryOne);

    const targetUserId = params.id;
    if (!targetUserId) return err('User id is required.', 400);

    const body = await req.json();
    const { planType, subscriptionStatus } = body ?? {};

    if (!planType || !VALID_PLANS.includes(planType)) {
      return err(`planType must be one of: ${VALID_PLANS.join(', ')}.`, 400);
    }
    if (!subscriptionStatus || !VALID_STATUSES.includes(subscriptionStatus)) {
      return err(`subscriptionStatus must be one of: ${VALID_STATUSES.join(', ')}.`, 400);
    }

    // Verify target user exists
    const targetUser = await queryOne<Pick<UserRow, 'id' | 'email' | 'plan_type'>>(
      'SELECT id, email, plan_type FROM users WHERE id = $1',
      [targetUserId]
    );
    if (!targetUser) return err('User not found.', 404);

    const { period_start, period_end } = getCalendarMonthPeriod();

    // Update the users table
    await updateUserPlan({
      userId: targetUserId,
      planType,
      subscriptionStatus,
      periodStart: period_start,
      periodEnd: period_end,
    });

    // Upsert a subscription record (provider = 'admin' for manual changes)
    await upsertSubscriptionRecord({
      userId: targetUserId,
      planCode: planType,
      provider: 'admin',
      providerSubscriptionId: null,
      status: subscriptionStatus,
      startedAt: period_start,
      expiresAt: period_end,
    });

    // Reset usage when plan changes
    await resetUsageForPeriod(targetUserId, period_start, period_end);

    // Return updated user row
    const updated = await queryOne<UserRow>(
      `SELECT id, email, "firstName", "lastName", plan_type, subscription_status,
              current_period_start, current_period_end, role
       FROM users WHERE id = $1`,
      [targetUserId]
    );

    return ok({
      message: 'Subscription updated successfully.',
      user: {
        id:                 updated!.id,
        email:              updated!.email,
        firstName:          updated!.firstName,
        lastName:           updated!.lastName,
        planType:           updated!.plan_type,
        subscriptionStatus: updated!.subscription_status,
        periodStart:        updated!.current_period_start,
        periodEnd:          updated!.current_period_end,
        role:               updated!.role,
      },
    });
  } catch (e) {
    if (e instanceof AuthError)      return err(e.message, 401);
    if (e instanceof ForbiddenError) return err(e.message, 403);
    console.error('[PATCH /api/admin/users/[id]/subscription]', e);
    return err('Internal server error.', 500);
  }
}
