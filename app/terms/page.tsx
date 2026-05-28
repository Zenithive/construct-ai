import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fafaf8]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="flex items-center gap-2.5 mb-8 w-fit hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-[#1D9E75] rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M3 7v14M21 7v14M6 21V11M10 21V11M14 21V11M18 21V11M3 7l9-4 9 4" />
              </svg>
            </div>
            <span className="text-[15px] font-medium text-[#111]">
              Construction<span className="text-[#1D9E75]">AI</span><span className="text-[#999]">.chat</span>
            </span>
          </Link>
          <h1 className="text-3xl font-semibold text-[#111] mb-2">Terms of Service</h1>
          <p className="text-sm text-[#999]">Last updated: May 2026</p>
        </div>

        <div className="bg-white border border-black/[0.09] rounded-xl p-8 shadow-sm space-y-8 text-sm text-[#555] leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using ConstructionAI.chat ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">2. Description of Service</h2>
            <p>ConstructionAI.chat provides an AI-powered assistant for construction regulations, safety standards, and compliance requirements. The Service is intended for informational purposes only and does not constitute professional legal, engineering, or regulatory advice.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorised use of your account.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">4. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Violate any applicable laws or regulations</li>
              <li>Transmit harmful, offensive, or unlawful content</li>
              <li>Attempt to gain unauthorised access to the Service or its systems</li>
              <li>Reverse engineer or attempt to extract the source code of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">5. Subscription and Billing</h2>
            <p>Paid plans are billed on a monthly basis. You may cancel your subscription at any time. Refunds are handled on a case-by-case basis. We reserve the right to change pricing with reasonable notice.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">6. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" without warranties of any kind. We do not guarantee the accuracy, completeness, or reliability of any information provided by the AI assistant. Always verify important information with qualified professionals.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">7. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, ConstructionAI.chat shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">8. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text[#111] mb-3">9. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:sales@zenithive.com" className="text-[#1D9E75] hover:text-[#0F6E56] underline">sales@zenithive.com</a>.</p>
          </section>
        </div>

        <p className="text-center text-xs text-[#999] mt-6">
          <Link href="/" className="text-[#1D9E75] hover:text-[#0F6E56]">← Back to sign in</Link>
          {' · '}
          <Link href="/privacy" className="text-[#1D9E75] hover:text-[#0F6E56]">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
