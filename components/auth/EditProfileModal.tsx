'use client';

import React, { useState } from 'react';
import { X, User, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  firstName: string;
  lastName: string;
  email: string;
  onClose: () => void;
  onSave: (firstName: string, lastName: string) => Promise<void>;
}

const EditProfileModal: React.FC<Props> = ({ firstName, lastName, email, onClose, onSave }) => {
  const [first, setFirst]     = useState(firstName);
  const [last, setLast]       = useState(lastName);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const hasChanges = first.trim() !== firstName || last.trim() !== lastName;

  const inputClass = (hasErr: boolean) =>
    `w-full px-4 py-3 bg-[#f7f7f5] border ${hasErr ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-black/[0.09] focus:border-[#1D9E75] focus:ring-[#E1F5EE]'} rounded-lg text-[#111] placeholder-[#999] text-sm focus:outline-none focus:ring-2 transition-all duration-150`;

  const handleSave = async () => {
    if (!first.trim()) { setError('First name is required.'); return; }
    if (!last.trim())  { setError('Last name is required.');  return; }
    setError('');
    setLoading(true);
    try {
      await onSave(first.trim(), last.trim());
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 900);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.09]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E1F5EE] flex items-center justify-center">
              <User className="w-4 h-4 text-[#1D9E75]" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-[#111]">Edit Profile</h2>
              <p className="text-xs text-[#999] mt-0.5">{email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#999] hover:text-[#555] hover:bg-[#f0f0ec] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#555] mb-1.5 font-medium">First name</label>
              <input
                type="text"
                value={first}
                onChange={e => { setFirst(e.target.value); setError(''); }}
                placeholder="First name"
                className={inputClass(false)}
              />
            </div>
            <div>
              <label className="block text-xs text-[#555] mb-1.5 font-medium">Last name</label>
              <input
                type="text"
                value={last}
                onChange={e => { setLast(e.target.value); setError(''); }}
                placeholder="Last name"
                className={inputClass(false)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#555] mb-1.5 font-medium">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-3 bg-[#f0f0ec] border border-black/[0.06] rounded-lg text-[#999] text-sm cursor-not-allowed"
            />
            <p className="text-[11px] text-[#999] mt-1 ml-0.5">Email cannot be changed.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#E1F5EE] border border-[#5DCAA5]/30 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-[#1D9E75] flex-shrink-0" />
              <p className="text-xs text-[#0F6E56]">Profile updated successfully.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-black/[0.09] bg-[#f7f7f5]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#555] hover:text-[#111] hover:bg-[#f0f0ec] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !hasChanges || success}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1D9E75] hover:bg-[#0F6E56] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving…
              </>
            ) : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
