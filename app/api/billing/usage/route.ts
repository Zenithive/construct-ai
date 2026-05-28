/**
 * GET /api/billing/usage — current plan and message usage for the authenticated user.
 */
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUsageSummary } from '@/lib/billing';
import { queryOne } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import type { SubscriptionStatus } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    const summary  = await getUsageSummary(authUser.userId);

    const user = await queryOne<{ subscription_status: SubscriptionStatus }>(
      'SELECT subscription_status FROM users WHERE id = $1',
      [authUser.userId]
    );
    if (!user) return err('User not found.', 404);

    return ok({
      used:               summary.used,
      limit:              summary.limit,
      remaining:          summary.remaining,
      plan: {
        code:         summary.plan.code,
        name:         summary.plan.name,
        messageLimit: summary.plan.message_limit,
      },
      periodStart:        summary.periodStart,
      periodEnd:          summary.periodEnd,
      subscriptionStatus: user.subscription_status,
    });
  } catch (e) {
    console.error('[GET /api/billing/usage]', e);
    return err('Internal server error.', 500);
  }
}
