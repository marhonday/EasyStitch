'use client'

import { useRouter } from 'next/navigation'

const LAST_UPDATED = 'March 2025'

const sections = [
  {
    title: '1. Acceptance of terms',
    body: `By using EasyStitch ("the Service") you agree to these Terms of Service. If you do not agree, please do not use the Service. We may update these terms at any time — continued use after an update constitutes acceptance.`,
  },
  {
    title: '2. What EasyStitch does',
    body: `EasyStitch is a browser-based tool that converts images you provide into craft patterns (crochet, knitting, cross-stitch, and related styles) for personal, non-commercial use. Pattern generation happens entirely in your browser — your images are never uploaded to our servers.`,
  },
  {
    title: '3. What you\'re buying',
    body: `When you purchase a pattern download you are paying for:\n• A PDF file containing the pattern generated from your specific image and settings\n• A PNG image of the pattern chart\n• Access to those files for download during the active unlock window (6 hours for a single-pattern purchase)\n\nThe pattern is generated automatically from your image and the settings you choose. You preview the pattern in the app before purchasing. What you see in the preview is what you receive — no manual adjustment or redesign is included.\n\nAll sales are final. Because the pattern is generated from your specific image and delivered digitally, we do not offer refunds once the files have been downloaded. If you encounter a technical error that prevents download after payment, contact us at support@easystitch.app and we will make it right.`,
  },
  {
    title: '4. Pattern quality and image responsibility',
    body: `Pattern quality depends on the image you provide and the settings you choose. EasyStitch provides a live preview before purchase so you can see exactly what your pattern will look like.\n\nWe strongly recommend:\n• Reviewing your pattern preview carefully before purchasing\n• Using the highest-quality, clearest image available\n• Experimenting with colour count and style settings before buying\n\nWe cannot regenerate, modify, or edit your pattern after purchase. If you would like a different result, adjust your settings and generate a new pattern before purchasing again.\n\nBy uploading an image you confirm that you have the right to use it (you took the photo, created the graphic, or have appropriate permission from the rights holder).`,
  },
  {
    title: '5. Intellectual property',
    body: `EasyStitch and its underlying software, algorithms, and visual design are the property of EasyStitch and are protected by applicable intellectual property law.\n\nPatterns you generate belong to you for personal use. You may use your generated pattern to make physical craft items, share your finished work, or give patterns as gifts. You may not resell, redistribute, or commercially exploit EasyStitch-generated patterns without our written permission.`,
  },
  {
    title: '6. Prohibited uses',
    body: `You agree not to:\n• Use the Service for any unlawful purpose\n• Upload images you do not have rights to use\n• Attempt to reverse-engineer, scrape, or copy the pattern generation software\n• Use automated tools to generate patterns in bulk\n• Resell access to the Service or generated patterns`,
  },
  {
    title: '7. Disclaimer of warranties',
    body: `EasyStitch is provided "as is" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or that any particular pattern will meet your expectations. You use the Service at your own risk.`,
  },
  {
    title: '8. Limitation of liability',
    body: `To the fullest extent permitted by law, EasyStitch shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability for any claim relating to a purchase shall not exceed the amount you paid for that specific transaction.`,
  },
  {
    title: '9. Governing law',
    body: `These terms are governed by the laws of the United States. Any disputes shall be resolved in the courts of competent jurisdiction in the United States.`,
  },
  {
    title: '10. Contact',
    body: `For any questions about these terms, email us at support@easystitch.app.`,
  },
]

export default function TermsPage() {
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
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: '#2C2218', fontWeight: 700, flex: 1, textAlign: 'center' }}>Terms of Service</span>
        <div style={{ width: 60 }} />
      </header>

      <div style={{ flex: 1, padding: '24px 20px 60px', maxWidth: 640, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Intro */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', marginBottom: 6 }}>
            Last updated: {LAST_UPDATED}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.75 }}>
            Please read these terms before using EasyStitch or purchasing a pattern. The key points: <strong style={{ color: '#2C2218' }}>you own the patterns you generate</strong>, the preview you see before purchasing is exactly what you get, and all sales are final once a pattern has been downloaded.
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
            onClick={() => router.push('/privacy')}
            style={{ width: '100%', padding: '13px', background: 'white', color: '#6B5744', border: '1.5px solid #E4D9C8', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: 'pointer' }}
          >
            🔒 Privacy Policy
          </button>
          <button
            onClick={() => router.push('/')}
            style={{ width: '100%', padding: '12px', background: 'transparent', color: '#9A8878', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer' }}
          >
            ← Back to EasyStitch
          </button>
        </div>

      </div>
    </main>
  )
}
