// Route: /verify-otp
import { Suspense } from 'react';
import OTPVerification from '@/components/auth/OTPVerification';

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" /></div>}>
      <OTPVerification />
    </Suspense>
  );
}
