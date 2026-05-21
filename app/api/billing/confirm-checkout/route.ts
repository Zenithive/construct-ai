/**
 * POST /api/billing/confirm-checkout
 * Fallback when webhooks do not reach localhost — sync plan after Stripe redirect.
 * Body: { sessionId: "cs_..." }
 */
import { NextRequest } from 'next/server';
import { AuthError, requireAuth } from '@/lib/auth';
import { repairSubscriptionRowFromStripe } from '@/lib/billing/subscriptions';
import { handleCheckoutSessionCompleted } from '@/lib/billing/stripe-webhooks';
import { getStripe, isStripeConfigured } from '@/lib/billing/stripe';
import { getUsageSummary } from '@/lib/billing/usage';
import { err, ok } from '@/lib/helpers';

export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return err('Stripe is not configured.', 503);
    }

    const authUser = requireAuth(req);
    const body = await req.json();
    const sessionId = (body?.sessionId as string | undefined)?.trim();
    if (!sessionId?.startsWith('cs_')) {
      return err('Valid Stripe checkout sessionId is required.', 400);
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const isPaid =
      session.payment_status === 'paid' || session.status === 'complete';
    if (!isPaid) {
      return err('Checkout is not completed yet.', 400);
    }

    const sessionUserId = session.metadata?.userId;
    if (sessionUserId && sessionUserId !== authUser.userId) {
      return err('Checkout session does not belong to this user.', 403);
    }

    await handleCheckoutSessionCompleted(session);

    // Repair if users row was updated earlier without a subscriptions insert
    await repairSubscriptionRowFromStripe(authUser.userId);

    const summary = await getUsageSummary(authUser.userId);
    return ok({
      plan: {
        code: summary.plan.code,
        name: summary.plan.name,
        messageLimit: summary.plan.message_limit,
      },
      subscriptionStatus: 'active',
      used: summary.used,
      limit: summary.limit,
      remaining: summary.remaining,
    });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, 401);
    console.error('[POST /api/billing/confirm-checkout]', e);
    const message = e instanceof Error ? e.message : 'Failed to confirm checkout.';
    return err(message, 500);
  }
}
