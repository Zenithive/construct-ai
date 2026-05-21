/**
 * Usage tracking per billing period.
 */
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '@/lib/db';
import { getCalendarMonthPeriod } from '@/lib/billing/period';
import { getPlanForUser, isUnlimitedPlan } from '@/lib/billing/plans';
import type { PlanCode, SubscriptionPlanRow, UsageTrackingRow, UserRow } from '@/types';

export interface UsageCheckResult {
  allowed: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
  planCode: PlanCode;
  periodStart: string;
  periodEnd: string;
}

export async function resolveBillingPeriod(
  userId: string
): Promise<{ period_start: Date; period_end: Date }> {
  const user = await queryOne<
    Pick<UserRow, 'current_period_start' | 'current_period_end' | 'subscription_status'>
  >(
    `SELECT current_period_start, current_period_end, subscription_status
     FROM users WHERE id = $1`,
    [userId]
  );
  if (!user) throw new Error('User not found');

  if (
    user.subscription_status === 'active' &&
    user.current_period_start &&
    user.current_period_end
  ) {
    return {
      period_start: new Date(user.current_period_start),
      period_end: new Date(user.current_period_end),
    };
  }

  return getCalendarMonthPeriod();
}

/** Active row for the current billing window (avoids period_start timestamp mismatch). */
export async function getActiveUsageRow(userId: string): Promise<UsageTrackingRow | null> {
  return queryOne<UsageTrackingRow>(
    `SELECT id, user_id, used_messages, used_tokens, period_start, period_end, created_at
     FROM usage_tracking
     WHERE user_id = $1 AND period_start <= NOW() AND period_end > NOW()
     ORDER BY period_start DESC
     LIMIT 1`,
    [userId]
  );
}

export async function getOrCreateCurrentUsage(userId: string): Promise<UsageTrackingRow> {
  const existing = await getActiveUsageRow(userId);
  if (existing) return existing;

  const { period_start, period_end } = await resolveBillingPeriod(userId);

  const id = uuidv4();
  const created = await queryOne<UsageTrackingRow>(
    `INSERT INTO usage_tracking (id, user_id, used_messages, used_tokens, period_start, period_end, created_at)
     VALUES ($1, $2, 0, 0, $3, $4, NOW())
     ON CONFLICT (user_id, period_start) DO UPDATE SET used_messages = usage_tracking.used_messages
     RETURNING id, user_id, used_messages, used_tokens, period_start, period_end, created_at`,
    [id, userId, period_start.toISOString(), period_end.toISOString()]
  );
  if (!created) throw new Error('Failed to create usage tracking row');
  return created;
}

/** Idempotent: ensure user has a usage row for the current billing period. */
export async function ensureBillingInitialized(userId: string): Promise<void> {
  await getOrCreateCurrentUsage(userId);
}

function toInt(value: unknown): number {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : 0;
}

export async function checkCanSend(userId: string): Promise<UsageCheckResult> {
  const plan = await getPlanForUser(userId);
  const usage = await getOrCreateCurrentUsage(userId);
  const used = toInt(usage.used_messages);

  if (isUnlimitedPlan(plan)) {
    return {
      allowed: true,
      used,
      limit: null,
      remaining: null,
      planCode: plan.code,
      periodStart: usage.period_start,
      periodEnd: usage.period_end,
    };
  }

  const limit = plan.message_limit as number;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    used,
    limit,
    remaining,
    planCode: plan.code,
    periodStart: usage.period_start,
    periodEnd: usage.period_end,
  };
}

export async function incrementUsage(userId: string, tokens = 0): Promise<number> {
  const usage = await getOrCreateCurrentUsage(userId);
  const updated = await queryOne<{ used_messages: number }>(
    `UPDATE usage_tracking
     SET used_messages = used_messages + 1,
         used_tokens = used_tokens + $3
     WHERE id = $1 AND user_id = $2
     RETURNING used_messages`,
    [usage.id, userId, tokens]
  );
  if (!updated) throw new Error('Failed to increment usage');
  return updated.used_messages;
}

export async function resetUsageForPeriod(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<UsageTrackingRow> {
  const id = uuidv4();
  const row = await queryOne<UsageTrackingRow>(
    `INSERT INTO usage_tracking (id, user_id, used_messages, used_tokens, period_start, period_end, created_at)
     VALUES ($1, $2, 0, 0, $3, $4, NOW())
     ON CONFLICT (user_id, period_start)
     DO UPDATE SET used_messages = 0, used_tokens = 0
     RETURNING id, user_id, used_messages, used_tokens, period_start, period_end, created_at`,
    [id, userId, periodStart.toISOString(), periodEnd.toISOString()]
  );
  if (!row) throw new Error('Failed to reset usage for period');
  return row;
}

export async function getUsageSummary(userId: string): Promise<{
  used: number;
  limit: number | null;
  remaining: number | null;
  plan: SubscriptionPlanRow;
  periodStart: string;
  periodEnd: string;
}> {
  const check = await checkCanSend(userId);
  const plan = await getPlanForUser(userId);
  return {
    used: check.used,
    limit: check.limit,
    remaining: check.remaining,
    plan,
    periodStart: check.periodStart,
    periodEnd: check.periodEnd,
  };
}
