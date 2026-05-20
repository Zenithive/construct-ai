// Route: /verify-otp
import { Suspense } from 'react';
import OTPVerification from '@/components/auth/OTPVerification';

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fafaf8] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E1F5EE] border-t-[#1D9E75]" /></div>}>
      <OTPVerification />
    </Suspense>
  );
}
