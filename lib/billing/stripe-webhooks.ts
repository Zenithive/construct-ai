/**
 * Stripe webhook event handlers.
 */
import type Stripe from 'stripe';
import {
  getStripe,
  getInvoiceSubscriptionId,
  getStripeSubscriptionId,
  loadSubscription,
  stripeResourceId,
  subscriptionPeriodDates,
} from '@/lib/billing/stripe';
import {
  activatePaidPlan,
  createPaymentRecord,
  deactivateToFree,
  getUserByStripeCustomerId,
  recordPaymentIfNew,
  updateUserPlan,
  upsertSubscriptionRecord,
} from '@/lib/billing/subscriptions';
import { resetUsageForPeriod } from '@/lib/billing/usage';
import { queryOne } from '@/lib/db';
import type { PlanCode, SubscriptionStatus } from '@/types';

async function resolveUserId(
  customerId: string | null | undefined,
  metadata?: Stripe.Metadata | null
): Promise<string | null> {
  if (metadata?.userId) return metadata.userId;
  if (!customerId) return null;
  const user = await getUserByStripeCustomerId(customerId);
  return user?.id ?? null;
}

function planCodeFromMetadata(metadata?: Stripe.Metadata | null): PlanCode {
  const code = metadata?.planCode;
  if (code === 'pro' || code === 'enterprise') return code;
  return 'pro';
}

function mapSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active';
  if (stripeStatus === 'past_due') return 'past_due';
  if (stripeStatus === 'canceled' || stripeStatus === 'unpaid') return 'canceled';
  return 'inactive';
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = await resolveUserId(
    session.customer as string | null,
    session.metadata
  );
  if (!userId) {
    console.error('[stripe] checkout.session.completed: user not found');
    return;
  }

  const planCode = planCodeFromMetadata(session.metadata);
  const sub = await loadSubscription(session.subscription);
  if (!sub) {
    console.error('[stripe] checkout.session.completed: no subscription');
    return;
  }

  const stripeSubId =
    getStripeSubscriptionId(sub) ||
    getStripeSubscriptionId(session.subscription);
  if (!stripeSubId) {
    console.error('[stripe] checkout.session.completed: missing sub_ id');
    return;
  }

  const customerId = stripeResourceId(
    session.customer as string | { id: string } | null
  );
  const { periodStart, periodEnd } = subscriptionPeriodDates(sub);

  const subRow = await activatePaidPlan({
    userId,
    planCode,
    stripeCustomerId: customerId ?? undefined,
    periodStart,
    periodEnd,
    providerSubscriptionId: stripeSubId,
    amount: sub.items.data[0]?.price?.unit_amount
      ? sub.items.data[0].price.unit_amount / 100
      : undefined,
  });

  const paymentIntentId = stripeResourceId(
    session.payment_intent as string | { id: string } | null
  );

  await recordPaymentIfNew({
    userId,
    subscriptionId: subRow?.id ?? null,
    providerPaymentId: paymentIntentId || session.id,
    amount: session.amount_total != null ? session.amount_total / 100 : null,
    currency: (session.currency || 'usd').toUpperCase(),
    status: 'succeeded',
    paymentMethod: 'stripe_checkout',
  });
}

export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string | null;
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!customerId || !subscriptionId) return;

  const userId = await resolveUserId(customerId, invoice.metadata);
  if (!userId) return;

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const planCode = planCodeFromMetadata(sub.metadata);
  const { periodStart, periodEnd } = subscriptionPeriodDates(sub);

  await updateUserPlan({
    userId,
    planType: planCode,
    subscriptionStatus: 'active',
    stripeCustomerId: customerId,
    periodStart,
    periodEnd,
  });

  const subRow = await upsertSubscriptionRecord({
    userId,
    planCode,
    provider: 'stripe',
    providerSubscriptionId: sub.id,
    status: sub.status,
    amount: invoice.amount_paid != null ? invoice.amount_paid / 100 : null,
    startedAt: periodStart,
    expiresAt: periodEnd,
  });

  await resetUsageForPeriod(userId, periodStart, periodEnd);

  await recordPaymentIfNew({
    userId,
    subscriptionId: subRow.id,
    providerPaymentId: invoice.id,
    amount: invoice.amount_paid != null ? invoice.amount_paid / 100 : null,
    currency: (invoice.currency || 'usd').toUpperCase(),
    status: 'paid',
    paymentMethod: 'stripe_invoice',
  });
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = await resolveUserId(
    subscription.customer as string,
    subscription.metadata
  );
  if (!userId) return;

  const planCode = planCodeFromMetadata(subscription.metadata);
  const status = mapSubscriptionStatus(subscription.status);
  const { periodStart, periodEnd } = subscriptionPeriodDates(subscription);

  if (status === 'canceled' && subscription.cancel_at_period_end) {
    await updateUserPlan({
      userId,
      planType: planCode,
      subscriptionStatus: 'active',
      periodStart,
      periodEnd,
    });
  } else if (status === 'active') {
    await updateUserPlan({
      userId,
      planType: planCode,
      subscriptionStatus: 'active',
      periodStart,
      periodEnd,
    });
  } else if (status === 'past_due') {
    await updateUserPlan({
      userId,
      planType: planCode,
      subscriptionStatus: 'past_due',
      periodStart,
      periodEnd,
    });
  }

  await upsertSubscriptionRecord({
    userId,
    planCode,
    provider: 'stripe',
    providerSubscriptionId: subscription.id,
    status: subscription.status,
    startedAt: periodStart,
    expiresAt: periodEnd,
  });
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = await resolveUserId(
    subscription.customer as string,
    subscription.metadata
  );
  if (!userId) return;
  await deactivateToFree(userId);
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string | null;
  if (!customerId) return;

  const userId = await resolveUserId(customerId, invoice.metadata);
  if (!userId) return;

  const user = await queryOne<{ plan_type: PlanCode }>(
    'SELECT plan_type FROM users WHERE id = $1',
    [userId]
  );
  if (!user) return;

  await updateUserPlan({
    userId,
    planType: user.plan_type,
    subscriptionStatus: 'past_due',
  });
}

export async function dispatchStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session
      );
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      break;
  }
}
