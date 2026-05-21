/**
 * POST /api/billing/create-checkout-session
 * Body: { planCode: 'pro' | 'enterprise' }
 * Returns: { url, sessionId }
 */
import { NextRequest } from 'next/server';
import { AuthError, requireAuth } from '@/lib/auth';
import { isStripeCheckoutPlan, STRIPE_CHECKOUT_PLAN_CODES } from '@/lib/billing/checkout-plans';
import { createCheckoutSession, isStripeConfigured } from '@/lib/billing/stripe';
import { queryOne } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import type { PlanCode } from '@/types';

export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return err(
        'Payments are not configured. Set STRIPE_SECRET_KEY and Stripe price IDs.',
        503
      );
    }

    const authUser = requireAuth(req);
    const body = await req.json();
    const planCode = (body?.planCode || 'pro') as PlanCode;

    if (!isStripeCheckoutPlan(planCode)) {
      return err(
        `Invalid plan. Choose one of: ${STRIPE_CHECKOUT_PLAN_CODES.join(', ')}.`,
        400
      );
    }

    const user = await queryOne<{ email: string }>(
      'SELECT email FROM users WHERE id = $1',
      [authUser.userId]
    );
    if (!user) return err('User not found.', 404);

    const session = await createCheckoutSession({
      userId: authUser.userId,
      email: user.email,
      planCode,
    });

    return ok({ url: session.url, sessionId: session.sessionId });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, 401);
    console.error('[POST /api/billing/create-checkout-session]', e);
    const message = e instanceof Error ? e.message : 'Internal server error.';
    return err(message, 500);
  }
}
