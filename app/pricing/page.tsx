'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import {
  billingApi,
  getToken,
  type BillingPlanListing,
} from '@/services/apiClient';

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<BillingPlanListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/');
      return;
    }
    billingApi
      .getPlans()
      .then((res) => setPlans(res.plans || []))
      .catch(() => setError('Could not load plans.'))
      .finally(() => setLoading(false));
  }, [router]);

  const startCheckout = async (planCode: string) => {
    if (planCode === 'free') {
      router.push('/dashboard');
      return;
    }
    try {
      setCheckoutPlan(planCode);
      setError(null);
      const { url } = await billingApi.createCheckoutSession(planCode);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed.');
      setCheckoutPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      <header className="border-b border-black/[0.09] bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-[#666] hover:text-[#111]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to chat
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-[#111]">Plans & pricing</h1>
        <p className="mt-2 text-[#666]">
          Choose the plan that fits your project. Message limits reset each billing period.
        </p>

        {loading && (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#1D9E75]" />
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {plans.map((plan) => {
              const isEnterprise = plan.code === 'enterprise';
              const isFree = plan.code === 'free';
              return (
                <div
                  key={plan.code}
                  className={`flex flex-col rounded-xl border p-6 ${
                    plan.code === 'pro'
                      ? 'border-[#1D9E75] shadow-md'
                      : 'border-black/[0.09] bg-white'
                  }`}
                >
                  <h2 className="text-lg font-semibold text-[#111]">{plan.name}</h2>
                  <p className="mt-2 text-3xl font-bold text-[#111]">
                    {isFree ? (
                      'Free'
                    ) : plan.priceMonthly != null && plan.priceMonthly > 0 ? (
                      <>
                        ${plan.priceMonthly}
                        <span className="text-base font-normal text-[#666]">/mo</span>
                      </>
                    ) : (
                      'Custom'
                    )}
                  </p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-[#555]">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1D9E75]" />
                      {plan.messageLimit != null
                        ? `${plan.messageLimit.toLocaleString()} messages / month`
                        : 'Unlimited messages'}
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1D9E75]" />
                      Construction AI chat
                    </li>
                    {!isFree && (
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1D9E75]" />
                        Priority support
                      </li>
                    )}
                  </ul>
                  <button
                    type="button"
                    disabled={!!checkoutPlan}
                    onClick={() => void startCheckout(plan.code)}
                    className={`mt-6 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                      isFree
                        ? 'border border-black/[0.09] bg-white text-[#111] hover:bg-black/[0.03]'
                        : 'bg-[#1D9E75] text-white hover:bg-[#0F6E56]'
                    }`}
                  >
                    {checkoutPlan === plan.code ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    ) : isFree ? (
                      'Current tier'
                    ) : (
                      `Get ${plan.name}`
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
