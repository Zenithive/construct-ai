'use client';

import React, { useState } from 'react';
import { Zap, Check } from 'lucide-react';
import { billingApi } from '@/services/apiClient';

interface Props {
  planName?: string;
  onUpgrade?: () => void;
}

const PLANS = [
  {
    code:     'pro',
    name:     'Pro',
    limit:    '1,000 messages / month',
    features: ['1,000 messages per month', 'Priority support', 'Advanced compliance queries', 'Export chat history'],
    cta:      'stripe', // goes to Stripe checkout
  },
  {
    code:     'enterprise',
    name:     'Enterprise',
    limit:    'Unlimited messages',
    features: ['Unlimited messages', 'Dedicated support', 'Custom integrations', 'Team management', 'SLA guarantee'],
    cta:      'contact', // contact sales
  },
];

const LimitExceededOverlay: React.FC<Props> = ({ planName = 'Free', onUpgrade }) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (planCode: string) => {
    if (onUpgrade) { onUpgrade(); return; }
    setLoadingPlan(planCode);
    try {
      const { url } = await billingApi.createCheckoutSession(planCode);
      if (url) window.location.href = url;
    } catch (e) {
      console.error('Failed to create checkout session:', e);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
      <div className="bg-white border border-black/[0.09] rounded-xl p-6 max-w-lg w-full mx-4 shadow-lg">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-amber-500" />
          </div>
          <h3 className="text-base font-semibold text-[#111]">Message limit reached</h3>
          <p className="text-sm text-[#555] mt-1">
            You've used all messages on the <strong>{planName}</strong> plan. Upgrade to continue chatting.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLANS.map(plan => (
            <div
              key={plan.code}
              className={`border rounded-xl p-4 flex flex-col gap-3 ${
                plan.code === 'pro' ? 'border-[#1D9E75] bg-[#f7fffe]' : 'border-black/[0.09]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-[#111]">{plan.name}</span>
                  {plan.code === 'pro' && (
                    <span className="text-[10px] bg-[#1D9E75] text-white px-2 py-0.5 rounded-full font-medium">Popular</span>
                  )}
                </div>
                <p className="text-xs text-[#999]">{plan.limit}</p>
              </div>
              <ul className="space-y-1.5 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[#555]">
                    <Check className="w-3.5 h-3.5 text-[#1D9E75] flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => plan.cta === 'contact'
                  ? window.location.href = 'mailto:sales@zenithive.com?subject=Enterprise Plan Enquiry'
                  : handleUpgrade(plan.code)
                }
                disabled={plan.cta === 'stripe' && !!loadingPlan}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  plan.code === 'pro'
                    ? 'bg-[#1D9E75] hover:bg-[#0F6E56] text-white'
                    : 'bg-[#111] hover:bg-[#333] text-white'
                }`}
              >
                {loadingPlan === plan.code ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Redirecting…
                  </>
                ) : plan.cta === 'contact' ? 'Contact Sales' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LimitExceededOverlay;
