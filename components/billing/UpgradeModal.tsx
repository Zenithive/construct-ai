"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Loader2 } from "lucide-react";
import { billingApi, type BillingPlanListing } from "@/services/apiClient";

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const [plans, setPlans] = useState<BillingPlanListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    billingApi
      .getPlans()
      .then((res) => {
        const paid = (res.plans || []).filter((p) => p.code !== "free");
        const order = ["pro", "enterprise"];
        paid.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
        setPlans(paid);
      })
      .catch(() => setError("Could not load plans."));
  }, [open]);

  const startCheckout = async (planCode: string) => {
    try {
      setCheckoutPlan(planCode);
      setError(null);
      const { url } = await billingApi.createCheckoutSession(planCode);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed.");
      setCheckoutPlan(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-labelledby="upgrade-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1 text-[#999] hover:bg-black/[0.05] hover:text-[#333]"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="upgrade-title" className="text-lg font-semibold text-[#111]">
          Upgrade your plan
        </h2>
        <p className="mt-1 text-sm text-[#666]">
          Get more messages and continue chatting without limits.
        </p>

        <div className="mt-5 space-y-3">
          {plans.map((plan) => (
            <div
              key={plan.code}
              className={`rounded-lg border p-4 ${
                plan.code === "enterprise"
                  ? "border-[#1D9E75]/40 bg-[#E8F5F0]/30"
                  : "border-black/[0.08]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[#111]">{plan.name}</p>
                  <p className="mt-0.5 text-sm text-[#666]">
                    {plan.messageLimit != null
                      ? `${plan.messageLimit.toLocaleString()} messages / month`
                      : "Unlimited messages"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#1D9E75]">
                    {plan.priceMonthly != null && plan.priceMonthly > 0
                      ? `INR ${plan.priceMonthly}/month`
                      : "Custom pricing — set in Stripe"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!!checkoutPlan}
                  onClick={() => void startCheckout(plan.code)}
                  className="shrink-0 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white hover:bg-[#0F6E56] disabled:opacity-50"
                >
                  {checkoutPlan === plan.code ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Upgrade"
                  )}
                </button>
              </div>
            </div>
          ))}

          {plans.length === 0 && !error && (
            <p className="text-sm text-[#666]">Loading plans…</p>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <p className="mt-4 text-center text-xs text-[#888]">
          <Link href="/pricing" className="font-medium text-[#1D9E75] hover:underline">
            Compare all plans
          </Link>
        </p>
      </div>
    </div>
  );
}
