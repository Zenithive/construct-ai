/**
 * POST /api/billing/confirm-checkout
 * Body: { sessionId: string }
 * Called after Stripe redirects back — confirms the subscription and updates the user.
 */
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { getStripe, updateUserPlan, resetUsageForPeriod, getPlanForUser } from '@/lib/billing';
import { ok, err } from '@/lib/helpers';
import { v4 as uuidv4 } from 'uuid';
import type { PlanCode, UserRow } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    const body     = await req.json();
    const { sessionId } = body ?? {};
    if (!sessionId) return err('sessionId is required.', 400);

    const stripe  = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status !== 'paid') {
      return err('Payment not completed.', 400);
    }

    const planCode        = (session.metadata?.planCode ?? 'pro') as PlanCode;
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const sub             = session.subscription as any;
    const periodStart     = sub ? new Date(sub.current_period_start * 1000) : new Date();
    const periodEnd       = sub ? new Date(sub.current_period_end   * 1000) : new Date(Date.now() + 30 * 86400000);

    // Update user
    await updateUserPlan({
      userId:             authUser.userId,
      planType:           planCode,
      subscriptionStatus: 'active',
      stripeCustomerId,
      periodStart,
      periodEnd,
    });

    // Upsert subscription record
    const subId = uuidv4();
    await query(
      `INSERT INTO subscriptions (id, user_id, plan_code, provider, provider_subscription_id, status, currency, started_at, expires_at, created_at)
       VALUES ($1, $2, $3, 'stripe', $4, 'active', 'USD', $5, $6, NOW())
       ON CONFLICT (provider, provider_subscription_id) WHERE provider_subscription_id IS NOT NULL
       DO UPDATE SET plan_code = $3, status = 'active', started_at = $5, expires_at = $6`,
      [subId, authUser.userId, planCode, sub?.id ?? null, periodStart.toISOString(), periodEnd.toISOString()]
    );

    // Reset usage
    await resetUsageForPeriod(authUser.userId, periodStart, periodEnd);

    const plan = await getPlanForUser(authUser.userId);
    const user = await queryOne<Pick<UserRow, 'subscription_status'>>(
      'SELECT subscription_status FROM users WHERE id = $1',
      [authUser.userId]
    );

    return ok({
      plan: { code: plan.code, name: plan.name, messageLimit: plan.message_limit },
      subscriptionStatus: user?.subscription_status ?? 'active',
      used:      0,
      limit:     plan.message_limit,
      remaining: plan.message_limit,
    });
  } catch (e) {
    console.error('[POST /api/billing/confirm-checkout]', e);
    return err('Internal server error.', 500);
  }
}
