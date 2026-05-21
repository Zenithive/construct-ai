/**
 * POST /api/webhook/stripe — Stripe webhook (raw body, signature verified).
 */
import { NextRequest, NextResponse } from 'next/server';
import { dispatchStripeEvent } from '@/lib/billing/stripe-webhooks';
import { isStripeConfigured, verifyWebhookEvent } from '@/lib/billing/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured.' }, { status: 503 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');
    const event = verifyWebhookEvent(rawBody, signature);

    await dispatchStripeEvent(event);

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('[POST /api/webhook/stripe]', e);
    const message = e instanceof Error ? e.message : 'Webhook error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
