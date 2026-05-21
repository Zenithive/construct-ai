/**
 * Persist subscription and payment state (used by Stripe webhooks in Phase 5).
 */
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '@/lib/db';
import { getCalendarMonthPeriod } from '@/lib/billing/period';
import { resetUsageForPeriod } from '@/lib/billing/usage';
import type { PlanCode, SubscriptionRow, SubscriptionStatus, UserRow } from '@/types';

export interface UpdateUserPlanParams {
  userId: string;
  planType: PlanCode;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}

export async function updateUserPlan(params: UpdateUserPlanParams): Promise<void> {
  const {
    userId,
    planType,
    subscriptionStatus,
    stripeCustomerId,
    periodStart,
    periodEnd,
  } = params;

  await query(
    `UPDATE users
     SET plan_type = $2,
         subscription_status = $3,
         stripe_customer_id = COALESCE($4, stripe_customer_id),
         current_period_start = $5,
         current_period_end = $6
     WHERE id = $1`,
    [
      userId,
      planType,
      subscriptionStatus,
      stripeCustomerId ?? null,
      periodStart?.toISOString() ?? null,
      periodEnd?.toISOString() ?? null,
    ]
  );
}

export interface UpsertSubscriptionParams {
  userId: string;
  planCode: string;
  provider: string;
  providerSubscriptionId: string | null;
  status: string | null;
  amount?: number | null;
  currency?: string;
  startedAt?: Date | null;
  expiresAt?: Date | null;
}

export async function upsertSubscriptionRecord(
  params: UpsertSubscriptionParams
): Promise<SubscriptionRow> {
  const {
    userId,
    planCode,
    provider,
    providerSubscriptionId,
    status,
    amount = null,
    currency = 'USD',
    startedAt,
    expiresAt,
  } = params;

  if (providerSubscriptionId) {
    const existing = await queryOne<SubscriptionRow>(
      `SELECT id, user_id, plan_code, provider, provider_subscription_id, status,
              amount, currency, started_at, expires_at, created_at
       FROM subscriptions
       WHERE provider = $1 AND provider_subscription_id = $2`,
      [provider, providerSubscriptionId]
    );
    if (existing) {
      await query(
        `UPDATE subscriptions
         SET plan_code = $2, status = $3, amount = $4, started_at = $5, expires_at = $6
         WHERE id = $1`,
        [
          existing.id,
          planCode,
          status,
          amount,
          startedAt?.toISOString() ?? null,
          expiresAt?.toISOString() ?? null,
        ]
      );
      const updated = await queryOne<SubscriptionRow>(
        `SELECT id, user_id, plan_code, provider, provider_subscription_id, status,
                amount, currency, started_at, expires_at, created_at
         FROM subscriptions WHERE id = $1`,
        [existing.id]
      );
      if (!updated) throw new Error('Failed to update subscription');
      return updated;
    }
  }

  const id = uuidv4();
  const row = await queryOne<SubscriptionRow>(
    `INSERT INTO subscriptions (
       id, user_id, plan_code, provider, provider_subscription_id,
       status, amount, currency, started_at, expires_at, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     RETURNING id, user_id, plan_code, provider, provider_subscription_id, status,
               amount, currency, started_at, expires_at, created_at`,
    [
      id,
      userId,
      planCode,
      provider,
      providerSubscriptionId,
      status,
      amount,
      currency,
      startedAt?.toISOString() ?? null,
      expiresAt?.toISOString() ?? null,
    ]
  );
  if (!row) throw new Error('Failed to create subscription');
  return row;
}

export interface CreatePaymentParams {
  userId: string;
  subscriptionId?: string | null;
  providerPaymentId: string | null;
  amount?: number | null;
  currency?: string;
  status?: string | null;
  paymentMethod?: string | null;
}

/** Skip insert if provider_payment_id already recorded (webhook idempotency). */
export async function recordPaymentIfNew(
  params: CreatePaymentParams
): Promise<string | null> {
  if (params.providerPaymentId) {
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM payments WHERE provider_payment_id = $1',
      [params.providerPaymentId]
    );
    if (existing) return existing.id;
  }
  return createPaymentRecord(params);
}

export async function createPaymentRecord(params: CreatePaymentParams): Promise<string> {
  const id = uuidv4();
  await query(
    `INSERT INTO payments (
       id, user_id, subscription_id, provider_payment_id,
       amount, currency, status, payment_method, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      id,
      params.userId,
      params.subscriptionId ?? null,
      params.providerPaymentId,
      params.amount ?? null,
      params.currency ?? 'USD',
      params.status ?? null,
      params.paymentMethod ?? null,
    ]
  );
  return id;
}

/** After successful paid subscription: upgrade user and reset usage for the new period. */
export async function activatePaidPlan(params: {
  userId: string;
  planCode: PlanCode;
  stripeCustomerId?: string;
  periodStart: Date;
  periodEnd: Date;
  providerSubscriptionId?: string;
  amount?: number;
}): Promise<SubscriptionRow> {
  const stripeSubId = params.providerSubscriptionId?.trim();
  if (!stripeSubId) {
    throw new Error('activatePaidPlan requires a Stripe subscription id (sub_...)');
  }

  await updateUserPlan({
    userId: params.userId,
    planType: params.planCode,
    subscriptionStatus: 'active',
    stripeCustomerId: params.stripeCustomerId,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
  });

  const row = await upsertSubscriptionRecord({
    userId: params.userId,
    planCode: params.planCode,
    provider: 'stripe',
    providerSubscriptionId: stripeSubId,
    status: 'active',
    amount: params.amount ?? null,
    startedAt: params.periodStart,
    expiresAt: params.periodEnd,
  });

  await resetUsageForPeriod(params.userId, params.periodStart, params.periodEnd);
  return row;
}

/** Downgrade to free when subscription ends. */
export async function deactivateToFree(userId: string): Promise<void> {
  const { period_start, period_end } = getCalendarMonthPeriod();
  await updateUserPlan({
    userId,
    planType: 'free',
    subscriptionStatus: 'inactive',
    periodStart: period_start,
    periodEnd: period_end,
  });
  await resetUsageForPeriod(userId, period_start, period_end);
}

export async function getUserByStripeCustomerId(
  stripeCustomerId: string
): Promise<Pick<UserRow, 'id' | 'email' | 'plan_type'> | null> {
  return queryOne(
    'SELECT id, email, plan_type FROM users WHERE stripe_customer_id = $1',
    [stripeCustomerId]
  );
}

/** Backfill subscriptions row for users already upgraded on users table only. */
export async function repairSubscriptionRowFromStripe(
  userId: string
): Promise<SubscriptionRow | null> {
  const { getStripe, getStripeSubscriptionId, subscriptionPeriodDates } =
    await import('@/lib/billing/stripe');

  const user = await queryOne<{
    stripe_customer_id: string | null;
    plan_type: PlanCode;
    current_period_start: string | null;
    current_period_end: string | null;
  }>(
    `SELECT stripe_customer_id, plan_type, current_period_start, current_period_end
     FROM users WHERE id = $1`,
    [userId]
  );
  if (!user?.stripe_customer_id) return null;

  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  if (existing) {
    return queryOne<SubscriptionRow>(
      `SELECT id, user_id, plan_code, provider, provider_subscription_id, status,
              amount, currency, started_at, expires_at, created_at
       FROM subscriptions WHERE id = $1`,
      [existing.id]
    );
  }

  const stripe = getStripe();
  const list = await stripe.subscriptions.list({
    customer: user.stripe_customer_id,
    status: 'all',
    limit: 5,
  });

  const active =
    list.data.find((s) => s.status === 'active' || s.status === 'trialing') ??
    list.data[0];
  if (!active) return null;

  const stripeSubId = getStripeSubscriptionId(active);
  if (!stripeSubId) return null;

  const fromStripe = subscriptionPeriodDates(active);
  const periodStart = user.current_period_start
    ? new Date(user.current_period_start)
    : fromStripe.periodStart;
  const periodEnd = user.current_period_end
    ? new Date(user.current_period_end)
    : fromStripe.periodEnd;

  return upsertSubscriptionRecord({
    userId,
    planCode: user.plan_type === 'free' ? 'pro' : user.plan_type,
    provider: 'stripe',
    providerSubscriptionId: stripeSubId,
    status: active.status,
    amount: active.items.data[0]?.price?.unit_amount
      ? active.items.data[0].price.unit_amount / 100
      : null,
    startedAt: periodStart,
    expiresAt: periodEnd,
  });
}
