/**
 * GET /api/billing/plans — list subscription plans (for pricing UI).
 */
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import type { SubscriptionPlanRow } from '@/types';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);

    const plans = await query<SubscriptionPlanRow>(
      `SELECT id, name, code, price_monthly, message_limit, features, created_at
       FROM subscription_plans
       ORDER BY
         CASE code
           WHEN 'free' THEN 0
           WHEN 'pro' THEN 1
           WHEN 'enterprise' THEN 2
           ELSE 3
         END`
    );

    return ok({
      plans: plans.map((p) => ({
        code: p.code,
        name: p.name,
        priceMonthly: p.price_monthly != null ? Number(p.price_monthly) : null,
        messageLimit: p.message_limit,
        features: p.features,
      })),
    });
  } catch (e) {
    console.error('[GET /api/billing/plans]', e);
    return err('Internal server error.', 500);
  }
}
