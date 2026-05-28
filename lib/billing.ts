/**
 * lib/billing.ts
 * All billing logic in one file — no external billing lib dependency.
 */
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '@/lib/db';
import type { PlanCode, SubscriptionStatus } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlanRow {
  id: string;
  name: string;
  code: PlanCode;
  price_monthly: string | null;
  message_limit: number | null;
  features: Record<string, unknown> | null;
}

export interface UsageRow {
  id: string;
  user_id: string;
  used_messages: number;
  used_tokens: number;
  period_start: string;
  period_end: string;
}

// ── Period helpers ────────────────────────────────────────────────────────────

export function currentMonthPeriod(): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  return {
    periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
    periodEnd:   new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

// ── Plan helpers ──────────────────────────────────────────────────────────────

export async function getPlanForUser(userId: string): Promise<PlanRow> {
  const user = await queryOne<{ plan_type: PlanCode }>(
    'SELECT plan_type FROM users WHERE id = $1',
    [userId]
  );
  const code = user?.plan_type ?? 'free';
  const plan = await queryOne<PlanRow>(
    'SELECT id, name, code, price_monthly, message_limit, features FROM subscription_plans WHERE code = $1',
    [code]
  );
  return plan ?? { id: '', name: 'Free', code: 'free', price_monthly: '0', message_limit: 20, features: null };
}

export function isUnlimitedPlan(plan: PlanRow): boolean {
  return plan.message_limit === null;
}

// ── Usage helpers ─────────────────────────────────────────────────────────────

export async function resolveBillingPeriod(userId: string): Promise<{ periodStart: Date; periodEnd: Date }> {
  const user = await queryOne<{
    current_period_start: string | null;
    current_period_end: string | null;
    subscription_status: SubscriptionStatus;
  }>(
    'SELECT current_period_start, current_period_end, subscription_status FROM users WHERE id = $1',
    [userId]
  );
  if (
    user?.subscription_status === 'active' &&
    user.current_period_start &&
    user.current_period_end
  ) {
    return {
      periodStart: new Date(user.current_period_start),
      periodEnd:   new Date(user.current_period_end),
    };
  }
  return currentMonthPeriod();
}

export async function getActiveUsageRow(userId: string): Promise<UsageRow | null> {
  return queryOne<UsageRow>(
    `SELECT id, user_id, used_messages, used_tokens, period_start, period_end
     FROM usage_tracking
     WHERE user_id = $1 AND period_start <= NOW() AND period_end > NOW()
     ORDER BY period_start DESC LIMIT 1`,
    [userId]
  );
}

export async function getOrCreateCurrentUsage(userId: string): Promise<UsageRow> {
  const existing = await getActiveUsageRow(userId);
  if (existing) return existing;

  const { periodStart, periodEnd } = await resolveBillingPeriod(userId);
  const id = uuidv4();
  const created = await queryOne<UsageRow>(
    `INSERT INTO usage_tracking (id, user_id, used_messages, used_tokens, period_start, period_end, created_at)
     VALUES ($1, $2, 0, 0, $3, $4, NOW())
     ON CONFLICT (user_id, period_start) DO UPDATE SET used_messages = usage_tracking.used_messages
     RETURNING id, user_id, used_messages, used_tokens, period_start, period_end`,
    [id, userId, periodStart.toISOString(), periodEnd.toISOString()]
  );
  if (!created) throw new Error('Failed to create usage tracking row');
  return created;
}

export async function checkCanSend(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
  planCode: PlanCode;
  periodStart: string;
  periodEnd: string;
}> {
  const plan  = await getPlanForUser(userId);
  const usage = await getOrCreateCurrentUsage(userId);
  const used  = Number(usage.used_messages);

  if (isUnlimitedPlan(plan)) {
    return { allowed: true, used, limit: null, remaining: null, planCode: plan.code, periodStart: usage.period_start, periodEnd: usage.period_end };
  }

  const limit     = plan.message_limit as number;
  const remaining = Math.max(0, limit - used);
  return { allowed: used < limit, used, limit, remaining, planCode: plan.code, periodStart: usage.period_start, periodEnd: usage.period_end };
}

export async function incrementUsage(userId: string, tokens = 0): Promise<number> {
  const usage = await getOrCreateCurrentUsage(userId);
  const updated = await queryOne<{ used_messages: number }>(
    `UPDATE usage_tracking SET used_messages = used_messages + 1, used_tokens = used_tokens + $3
     WHERE id = $1 AND user_id = $2 RETURNING used_messages`,
    [usage.id, userId, tokens]
  );
  if (!updated) throw new Error('Failed to increment usage');
  return updated.used_messages;
}

export async function resetUsageForPeriod(userId: string, periodStart: Date, periodEnd: Date): Promise<void> {
  const id = uuidv4();
  await query(
    `INSERT INTO usage_tracking (id, user_id, used_messages, used_tokens, period_start, period_end, created_at)
     VALUES ($1, $2, 0, 0, $3, $4, NOW())
     ON CONFLICT (user_id, period_start) DO UPDATE SET used_messages = 0, used_tokens = 0`,
    [id, userId, periodStart.toISOString(), periodEnd.toISOString()]
  );
}

export async function getUsageSummary(userId: string) {
  const check = await checkCanSend(userId);
  const plan  = await getPlanForUser(userId);
  return {
    used:        check.used,
    limit:       check.limit,
    remaining:   check.remaining,
    plan,
    periodStart: check.periodStart,
    periodEnd:   check.periodEnd,
  };
}

// ── Stripe helpers ────────────────────────────────────────────────────────────

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set.');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe');
  return new Stripe(key, { apiVersion: '2024-04-10' });
}

// ── Update user plan ──────────────────────────────────────────────────────────

export async function updateUserPlan(params: {
  userId: string;
  planType: PlanCode;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}): Promise<void> {
  await query(
    `UPDATE users
     SET plan_type            = $2,
         subscription_status  = $3,
         stripe_customer_id   = COALESCE($4, stripe_customer_id),
         current_period_start = $5,
         current_period_end   = $6
     WHERE id = $1`,
    [
      params.userId,
      params.planType,
      params.subscriptionStatus,
      params.stripeCustomerId ?? null,
      params.periodStart?.toISOString() ?? null,
      params.periodEnd?.toISOString() ?? null,
    ]
  );
}
