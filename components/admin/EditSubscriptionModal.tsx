'use client';

import React, { useState } from 'react';
import { X, CreditCard, AlertCircle } from 'lucide-react';
import type { AdminUser } from '@/services/apiClient';

const PLAN_OPTIONS = [
  { value: 'free',       label: 'Free',       desc: '20 messages / month' },
  { value: 'pro',        label: 'Pro',         desc: '1,000 messages / month' },
  { value: 'enterprise', label: 'Enterprise',  desc: 'Unlimited messages' },
];
const STATUS_OPTIONS = [
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'past_due', label: 'Past Due' },
  { value: 'canceled', label: 'Canceled' },
];

interface Props {
  user: AdminUser;
  onClose: () => void;
  onSave: (planType: string, subscriptionStatus: string) => Promise<void>;
}

const EditSubscriptionModal: React.FC<Props> = ({ user, onClose, onSave }) => {
  const [planType, setPlanType]         = useState(user.planType);
  const [subscriptionStatus, setStatus] = useState(user.subscriptionStatus);
  const [isLoading, setLoading]         = useState(false);
  const [error, setError]               = useState('');

  const hasChanges = planType !== user.planType || subscriptionStatus !== user.subscriptionStatus;

  const handleSave = async () => {
    setError('');
    setLoading(true);
    try {
      await onSave(planType, subscriptionStatus);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update subscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.09]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E1F5EE] flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-[#1D9E75]" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-[#111]">Edit Subscription</h2>
              <p className="text-xs text-[#999] mt-0.5">{user.firstName} {user.lastName} · {user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#999] hover:text-[#555] hover:bg-[#f0f0ec] transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-[#555] mb-2">Plan</label>
            <div className="space-y-2">
              {PLAN_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setPlanType(opt.value)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all duration-150 ${planType === opt.value ? 'border-[#1D9E75] bg-[#E1F5EE]' : 'border-black/[0.09] bg-[#f7f7f5] hover:border-black/[0.18]'}`}>
                  <div>
                    <span className={`text-sm font-medium ${planType === opt.value ? 'text-[#0F6E56]' : 'text-[#111]'}`}>{opt.label}</span>
                    <span className="block text-xs text-[#999] mt-0.5">{opt.desc}</span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${planType === opt.value ? 'border-[#1D9E75]' : 'border-[#ccc]'}`}>
                    {planType === opt.value && <div className="w-2 h-2 rounded-full bg-[#1D9E75]" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#555] mb-2">Subscription Status</label>
            <select value={subscriptionStatus} onChange={e => setStatus(e.target.value)}
              className="w-full px-4 py-3 bg-[#f7f7f5] border border-black/[0.09] rounded-lg text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] focus:border-[#1D9E75] transition-all">
              {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {planType === 'free' && user.planType !== 'free' && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Downgrading to Free will reset the user's usage immediately.</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-black/[0.09] bg-[#f7f7f5]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#555] hover:text-[#111] hover:bg-[#f0f0ec] rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={isLoading || !hasChanges}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1D9E75] hover:bg-[#0F6E56] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {isLoading ? (<><svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Saving…</>) : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSubscriptionModal;
