/**
 * GET /api/billing/plans — returns all subscription plans
 */
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import type { PlanRow } from '@/lib/billing';

export async function GET(_req: NextRequest) {
  try {
    const plans = await query<PlanRow>(
      'SELECT id, name, code, price_monthly, message_limit, features FROM subscription_plans ORDER BY message_limit ASC NULLS LAST'
    );
    return ok({
      plans: plans.map(p => ({
        code:         p.code,
        name:         p.name,
        priceMonthly: p.price_monthly ? parseFloat(p.price_monthly) : null,
        messageLimit: p.message_limit,
        features:     p.features,
      })),
    });
  } catch (e) {
    console.error('[GET /api/billing/plans]', e);
    return err('Internal server error.', 500);
  }
}
