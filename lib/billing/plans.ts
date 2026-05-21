/**
 * Subscription plan lookups.
 */
import { queryOne } from '@/lib/db';
import type { PlanCode, SubscriptionPlanRow, UserRow } from '@/types';

export async function getPlanByCode(code: PlanCode): Promise<SubscriptionPlanRow | null> {
  return queryOne<SubscriptionPlanRow>(
    `SELECT id, name, code, price_monthly, message_limit, features, created_at
     FROM subscription_plans WHERE code = $1`,
    [code]
  );
}

export async function getPlanForUser(userId: string): Promise<SubscriptionPlanRow> {
  const user = await queryOne<Pick<UserRow, 'plan_type'>>(
    'SELECT plan_type FROM users WHERE id = $1',
    [userId]
  );
  if (!user) throw new Error('User not found');

  const plan = await getPlanByCode(user.plan_type as PlanCode);
  if (!plan) throw new Error(`Plan not found: ${user.plan_type}`);
  return plan;
}

/** NULL message_limit means unlimited (enterprise). */
export function isUnlimitedPlan(plan: SubscriptionPlanRow): boolean {
  return plan.message_limit === null;
}
