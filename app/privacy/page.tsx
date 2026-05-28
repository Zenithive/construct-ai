import Link from 'next/link';

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-semibold text-[#111] mb-2">Privacy Policy</h1>
          <p className="text-sm text-[#999]">Last updated: May 2026</p>
        </div>

        <div className="bg-white border border-black/[0.09] rounded-xl p-8 shadow-sm space-y-8 text-sm text-[#555] leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Account information (name, email address, password)</li>
              <li>Chat messages and conversation history</li>
              <li>Usage data and interaction logs</li>
              <li>Payment information (processed securely via Stripe)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process transactions and send related information</li>
              <li>Respond to comments and questions</li>
              <li>Monitor and analyse usage patterns to improve user experience</li>
              <li>Send administrative information such as updates and security alerts</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">3. Data Storage and Security</h2>
            <p>Your data is stored on secure servers. We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">4. Data Sharing</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information with:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Service providers who assist in operating the Service (e.g., payment processors)</li>
              <li>Law enforcement when required by applicable law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">5. Cookies</h2>
            <p>We use cookies and similar tracking technologies to maintain your session and improve your experience. You can control cookie settings through your browser preferences.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Object to processing of your personal data</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at <a href="mailto:info@zenithive.com" className="text-[#1D9E75] hover:text-[#0F6E56] underline">info@zenithive.com</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">7. Data Retention</h2>
            <p>We retain your personal data for as long as your account is active or as needed to provide the Service. You may request deletion of your data at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">8. Children's Privacy</h2>
            <p>The Service is not directed to individuals under the age of 16. We do not knowingly collect personal information from children.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#111] mb-3">10. Contact</h2>
            <p>For questions about this Privacy Policy, contact us at <a href="mailto:info@zenithive.com" className="text-[#1D9E75] hover:text-[#0F6E56] underline">info@zenithive.com</a>.</p>
          </section>
        </div>

        <p className="text-center text-xs text-[#999] mt-6">
          <Link href="/" className="text-[#1D9E75] hover:text-[#0F6E56]">← Back to sign in</Link>
          {' · '}
          <Link href="/terms" className="text-[#1D9E75] hover:text-[#0F6E56]">Terms of Service</Link>
        </p>
      </div>
    </div>
  );
}
