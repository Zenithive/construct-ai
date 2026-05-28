/**
 * POST /api/webhook/stripe
 * Handles Stripe webhook events.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { updateUserPlan, resetUsageForPeriod, getStripe } from '@/lib/billing';
import { v4 as uuidv4 } from 'uuid';
import type { PlanCode, UserRow } from '@/types';

export async function POST(req: NextRequest) {
  const stripe     = getStripe();
  const body       = await req.text();
  const sig        = req.headers.get('stripe-signature') ?? '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e: any) {
    console.error('[Stripe webhook] signature verification failed:', e.message);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session  = event.data.object as any;
        if (session.payment_status !== 'paid') break;
        const userId   = session.metadata?.userId;
        const planCode = (session.metadata?.planCode ?? 'pro') as PlanCode;
        if (!userId) break;

        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;
        const sub = session.subscription
          ? await stripe.subscriptions.retrieve(session.subscription)
          : null;
        const periodStart = sub ? new Date(sub.current_period_start * 1000) : new Date();
        const periodEnd   = sub ? new Date(sub.current_period_end   * 1000) : new Date(Date.now() + 30 * 86400000);

        await updateUserPlan({ userId, planType: planCode, subscriptionStatus: 'active', stripeCustomerId, periodStart, periodEnd });
        await resetUsageForPeriod(userId, periodStart, periodEnd);

        if (sub) {
          await query(
            `INSERT INTO subscriptions (id, user_id, plan_code, provider, provider_subscription_id, status, currency, started_at, expires_at, created_at)
             VALUES ($1, $2, $3, 'stripe', $4, 'active', 'USD', $5, $6, NOW())
             ON CONFLICT (provider, provider_subscription_id) WHERE provider_subscription_id IS NOT NULL
             DO UPDATE SET plan_code = $3, status = 'active', started_at = $5, expires_at = $6`,
            [uuidv4(), userId, planCode, sub.id, periodStart.toISOString(), periodEnd.toISOString()]
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub      = event.data.object as any;
        const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        const user     = await queryOne<Pick<UserRow, 'id'>>('SELECT id FROM users WHERE stripe_customer_id = $1', [customer]);
        if (!user) break;

        const periodStart = new Date(sub.current_period_start * 1000);
        const periodEnd   = new Date(sub.current_period_end   * 1000);
        const status      = sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'canceled';

        await updateUserPlan({ userId: user.id, planType: sub.metadata?.planCode ?? 'pro', subscriptionStatus: status as any, periodStart, periodEnd });
        await query(`UPDATE subscriptions SET status = $1, expires_at = $2 WHERE provider_subscription_id = $3`, [status, periodEnd.toISOString(), sub.id]);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub      = event.data.object as any;
        const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        const user     = await queryOne<Pick<UserRow, 'id'>>('SELECT id FROM users WHERE stripe_customer_id = $1', [customer]);
        if (!user) break;

        const { periodStart, periodEnd } = { periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1), periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1) };
        await updateUserPlan({ userId: user.id, planType: 'free', subscriptionStatus: 'inactive', periodStart, periodEnd });
        await resetUsageForPeriod(user.id, periodStart, periodEnd);
        await query(`UPDATE subscriptions SET status = 'canceled' WHERE provider_subscription_id = $1`, [sub.id]);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice  = event.data.object as any;
        const customer = typeof invoice.customer === 'string' ? invoice.customer : null;
        if (!customer) break;
        const user = await queryOne<Pick<UserRow, 'id'>>('SELECT id FROM users WHERE stripe_customer_id = $1', [customer]);
        if (!user) break;
        await query(`UPDATE users SET subscription_status = 'past_due' WHERE id = $1`, [user.id]);
        break;
      }
    }
  } catch (e) {
    console.error('[Stripe webhook] handler error:', e);
  }

  return NextResponse.json({ received: true });
}
