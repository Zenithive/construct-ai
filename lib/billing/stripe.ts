/**
 * Stripe client — checkout sessions and webhook verification.
 */
import Stripe from 'stripe';
import { query, queryOne } from '@/lib/db';

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set.');
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

const PRICE_ENV_KEYS: Record<string, string> = {
  pro: 'STRIPE_PRICE_PRO_MONTHLY',
  enterprise: 'STRIPE_PRICE_ENTERPRISE_MONTHLY',
};

export function getStripePriceId(planCode: string): string | undefined {
  const envKey = PRICE_ENV_KEYS[planCode];
  if (!envKey) return undefined;
  return process.env[envKey]?.trim();
}

export function getRequiredStripePriceEnvKeys(): string[] {
  return Object.values(PRICE_ENV_KEYS);
}

export function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export type StripeCheckoutParams = {
  userId: string;
  email: string;
  planCode: string;
};

export async function ensureStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const row = await queryOne<{ stripe_customer_id: string | null }>(
    'SELECT stripe_customer_id FROM users WHERE id = $1',
    [userId]
  );
  if (row?.stripe_customer_id) return row.stripe_customer_id;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: email.toLowerCase(),
    metadata: { userId },
  });

  await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [
    customer.id,
    userId,
  ]);

  return customer.id;
}

export async function createCheckoutSession(
  params: StripeCheckoutParams
): Promise<{ url: string; sessionId: string }> {
  if (!isStripeConfigured()) {
    throw new Error(
      'Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs (STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_ENTERPRISE_MONTHLY).'
    );
  }

  const priceId = getStripePriceId(params.planCode);
  if (!priceId) {
    throw new Error(`No Stripe price configured for plan: ${params.planCode}`);
  }

  const stripe = getStripe();
  const customerId = await ensureStripeCustomer(params.userId, params.email);
  const baseUrl = getAppBaseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/dashboard?checkout=cancel`,
    metadata: {
      userId: params.userId,
      planCode: params.planCode,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
        planCode: params.planCode,
      },
    },
  });

  if (!session.url) throw new Error('Stripe did not return a checkout URL.');
  return { url: session.url, sessionId: session.id };
}

export function verifyWebhookEvent(
  rawBody: string,
  signature: string | null
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set.');
  if (!signature) throw new Error('Missing stripe-signature header.');

  const stripe = getStripe();
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
};

/** Period bounds from subscription (handles Stripe API type variations). */
export function subscriptionPeriodDates(sub: Stripe.Subscription): {
  periodStart: Date;
  periodEnd: Date;
} {
  const extended = sub as SubscriptionWithPeriod;
  const item = sub.items?.data?.[0] as unknown as SubscriptionWithPeriod | undefined;
  const startSec =
    extended.current_period_start ?? item?.current_period_start;
  const endSec = extended.current_period_end ?? item?.current_period_end;

  if (startSec != null && endSec != null) {
    return {
      periodStart: new Date(startSec * 1000),
      periodEnd: new Date(endSec * 1000),
    };
  }

  const now = new Date();
  return {
    periodStart: now,
    periodEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

/** Stripe id field may be a string or an expanded object when using expand[]. */
export function stripeResourceId(
  value: string | { id: string } | null | undefined
): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.id ?? null;
}

/** Use expanded subscription from Checkout Session when present; otherwise retrieve by id. */
export async function loadSubscription(
  subscription: string | Stripe.Subscription | null | undefined
): Promise<Stripe.Subscription | null> {
  if (!subscription) return null;
  if (typeof subscription !== 'string') {
    return subscription;
  }
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscription);
}

export function getStripeSubscriptionId(
  subscription: string | Stripe.Subscription | null | undefined
): string | null {
  if (!subscription) return null;
  if (typeof subscription === 'string') return subscription;
  return subscription.id ?? null;
}

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const inv = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    parent?: { subscription_details?: { subscription?: string | null } };
  };
  if (typeof inv.subscription === 'string') return inv.subscription;
  if (inv.subscription && typeof inv.subscription === 'object') {
    return inv.subscription.id;
  }
  const fromParent = inv.parent?.subscription_details?.subscription;
  if (typeof fromParent === 'string') return fromParent;
  return null;
}
