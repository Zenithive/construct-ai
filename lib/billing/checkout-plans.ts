import type { PlanCode } from '@/types';

/** Plans that can be purchased via Stripe Checkout (not free). */
export const STRIPE_CHECKOUT_PLAN_CODES: PlanCode[] = ['pro', 'enterprise'];

export function isStripeCheckoutPlan(code: string): code is PlanCode {
  return STRIPE_CHECKOUT_PLAN_CODES.includes(code as PlanCode);
}
