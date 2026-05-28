/**
 * POST /api/billing/create-checkout-session
 * Body: { planCode: 'pro' | 'enterprise' }
 * Creates a Stripe Checkout session and returns the URL.
 */
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { getStripe } from '@/lib/billing';
import { ok, err } from '@/lib/helpers';
import type { UserRow } from '@/types';

const PRICE_MAP: Record<string, string | undefined> = {
  pro:        process.env.STRIPE_PRICE_PRO_MONTHLY,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
};

export async function POST(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    const body     = await req.json();
    const { planCode } = body ?? {};

    if (!planCode || !PRICE_MAP[planCode]) {
      return err('Invalid planCode. Must be pro or enterprise.', 400);
    }

    const priceId = PRICE_MAP[planCode];
    if (!priceId) return err(`Stripe price not configured for plan: ${planCode}`, 500);

    const user = await queryOne<Pick<UserRow, 'id' | 'email' | 'stripe_customer_id'>>(
      'SELECT id, email, stripe_customer_id FROM users WHERE id = $1',
      [authUser.userId]
    );
    if (!user) return err('User not found.', 404);

    const stripe  = getStripe();
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode:               'subscription',
      payment_method_types: ['card'],
      customer:           user.stripe_customer_id ?? undefined,
      customer_email:     user.stripe_customer_id ? undefined : user.email,
      line_items:         [{ price: priceId, quantity: 1 }],
      success_url:        `${appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:         `${appUrl}/pricing?checkout=cancelled`,
      metadata:           { userId: user.id, planCode },
    });

    return ok({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error('[POST /api/billing/create-checkout-session]', e);
    return err('Internal server error.', 500);
  }
}
