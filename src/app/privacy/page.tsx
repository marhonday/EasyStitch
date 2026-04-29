'use client'

import { useRouter } from 'next/navigation'

const LAST_UPDATED = 'April 2025'

const sections = [
  {
    title: '1. Who we are',
    body: `CraftWabi ("we", "us", "our") is an online tool that converts your photos and images into stitch-by-stitch craft patterns. We are operated as a small independent product. You can reach us at support@craftwabi.com with any privacy-related questions.`,
  },
  {
    title: '2. What we collect — and what we don\'t',
    body: `Your images are never uploaded to our servers. All image processing — resizing, colour quantization, and pattern generation — happens entirely inside your browser on your own device. We never see your photos.\n\nWhen you purchase a pattern download, Stripe processes your payment. We receive a confirmation that payment cleared and a Stripe session ID, but we do not receive or store your full card number, billing address, or name.\n\nWe store a small unlock token in your browser's localStorage to confirm that payment was successful. This token expires after 6 hours (single-pattern purchase) or 30 days (monthly plan) and contains no personal information — it is an HMAC of the Stripe session ID.\n\nSaved patterns ("My Patterns") are stored entirely in your browser's localStorage. We never receive or store your pattern data on our servers.`,
  },
  {
    title: '3. Cookies and local storage',
    body: `We do not use advertising cookies or third-party tracking cookies.\n\nWe use browser localStorage to:\n• Remember your unlock status after payment\n• Save patterns you choose to add to "My Patterns"\n• Remember your most recent pattern settings during your session\n\nThis data lives on your device and is never transmitted to us.`,
  },
  {
    title: '4. Stripe payments',
    body: `Payment is handled by Stripe, Inc. When you click "Unlock My Pattern", you are redirected to a Stripe-hosted checkout page. Stripe's privacy policy governs how your payment information is collected and stored. CraftWabi never has access to your card details.\n\nStripe may set its own cookies during the checkout flow. You can read Stripe's privacy policy at stripe.com/privacy.`,
  },
  {
    title: '5. Analytics and logging',
    body: `We log basic usage events (e.g. "pattern generated", "PDF downloaded") to understand how the app is being used. These logs contain no personally identifiable information — no IP address, no name, no email. They are used purely for product improvement.`,
  },
  {
    title: '6. Data sharing',
    body: `We do not sell, rent, or share your personal data with any third parties for marketing or advertising purposes. The only third party that receives any data related to your use of CraftWabi is Stripe, solely for the purpose of processing payment.`,
  },
  {
    title: '7. Data retention',
    body: `Because we store almost nothing server-side, there is very little to retain. Stripe session confirmation records are held for as long as required for financial record-keeping (typically 7 years). Anonymous usage logs are retained for up to 12 months.\n\nYour pattern data and unlock tokens exist only in your browser's localStorage. You can clear them at any time by clearing your browser's site data, or by using the "Make Another Pattern" reset button in the app.`,
  },
  {
    title: '8. Your rights',
    body: `You have the right to:\n• Know what data we hold about you\n• Request deletion of any data we hold\n• Withdraw consent at any time\n\nBecause we hold almost no identifiable data, most requests can be fulfilled simply by clearing your browser's localStorage. For anything related to your Stripe payment record, email us at support@craftwabi.com and we will respond within 5 business days.`,
  },
  {
    title: '9. Children\'s privacy',
    body: `CraftWabi is not directed at children under 13. We do not knowingly collect any information from children. If you believe a child has submitted payment information through our site, please contact us immediately at support@craftwabi.com.`,
  },
  {
    title: '10. Changes to this policy',
    body: `We may update this policy as the product evolves. If we make material changes, we will update the "Last updated" date at the top of this page. Continued use of CraftWabi after changes are posted constitutes acceptance of the updated policy.`,
  },
  {
    title: '11. Contact',
    body: `For any privacy questions or requests, email us at support@craftwabi.com. We read every message.`,
  },
]

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', padding: '16px 20px 10px', gap: 12, borderBottom: '1px solid #EDE4D8', background: 'white' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#9A8878', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: '#2C2218', fontWeight: 700, flex: 1, textAlign: 'center' }}>Privacy Policy</span>
        <div style={{ width: 60 }} />
      </header>

      <div style={{ flex: 1, padding: '24px 20px 60px', maxWidth: 640, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Intro */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', marginBottom: 6 }}>
            Last updated: {LAST_UPDATED}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.75 }}>
            Your privacy matters to us. The short version: <strong style={{ color: '#2C2218' }}>your photos never leave your device</strong>, we don't track you, and we only collect the minimum information needed to process your payment. Here's the full picture.
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sections.map((s, i) => (
            <div
              key={i}
              style={{ background: 'white', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 6px rgba(44,34,24,0.05)' }}
            >
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 8 }}>
                {s.title}
              </p>
              {s.body.split('\n').map((line, li) => (
                line.trim() === '' ? null : (
                  <p key={li} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', lineHeight: 1.75, marginBottom: 6 }}>
                    {line}
                  </p>
                )
              ))}
            </div>
          ))}
        </div>

        {/* Footer links */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => router.push('/terms')}
            style={{ width: '100%', padding: '13px', background: 'white', color: '#6B5744', border: '1.5px solid #E4D9C8', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: 'pointer' }}
          >
            📋 Terms of Service
          </button>
          <button
            onClick={() => router.push('/')}
            style={{ width: '100%', padding: '12px', background: 'transparent', color: '#9A8878', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer' }}
          >
            ← Back to CraftWabi
          </button>
        </div>

      </div>
    </main>
  )
}
