'use client'

import { useRouter } from 'next/navigation'

export default function DonatePage() {
  const router = useRouter()

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '16px 20px 10px', gap: 12 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(44,34,24,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'rgba(44,34,24,0.75)', fontWeight: 600, flex: 1, textAlign: 'center' }}>Support</span>
        <div style={{ width: 60 }} />
      </header>

      <div style={{ flex: 1, padding: '8px 24px 60px', maxWidth: 480, margin: '0 auto', width: '100%' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 60, marginBottom: 12 }}>☕</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#2C2218', marginBottom: 10 }}>
            Support CraftWabi
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.8, maxWidth: 340, margin: '0 auto' }}>
            CraftWabi is free to use. If it&apos;s saved you hours of frustration and you&apos;d like to support further development, a small donation goes a long way.
          </p>
        </div>

        {/* What it supports */}
        <div style={{ background: 'white', borderRadius: 20, padding: '18px 20px', marginBottom: 20, boxShadow: '0 2px 12px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 12 }}>Your support helps pay for:</p>
          {[
            ['🖥️', 'Hosting and infrastructure costs'],
            ['🔧', 'Ongoing improvements and bug fixes'],
            ['✨', 'New stitch styles, better colour engines, and more export options'],
            ['☕', 'Many late-night coffees while the code is compiling'],
          ].map(([emoji, text]) => (
            <div key={String(text)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.5 }}>{emoji}</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#3D2C1E', lineHeight: 1.65 }}>{text}</p>
            </div>
          ))}
        </div>

        {/* Donate buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <a
            href="https://ko-fi.com/easystitch"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '16px',
              background: '#FF5E5B', color: 'white',
              borderRadius: 14, fontFamily: "'DM Sans', sans-serif",
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              textDecoration: 'none', textAlign: 'center',
              boxShadow: '0 4px 20px rgba(255,94,91,0.30)',
              boxSizing: 'border-box',
            } as React.CSSProperties}
          >
            ☕ Support on Ko-fi
          </a>

          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#B8AAA0', textAlign: 'center' }}>
            ko-fi.com/easystitch · No account needed · Any amount is appreciated · 100% optional
          </p>
        </div>

        {/* Thank you */}
        <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(196,97,74,0.06)', borderRadius: 16, marginBottom: 20 }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: '#C4614A', fontWeight: 600, marginBottom: 6 }}>
            Thank you 🧶
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', lineHeight: 1.7 }}>
            Every contribution — big or small — is genuinely appreciated and goes directly into making CraftWabi better for everyone.
          </p>
        </div>

        {/* Gallery link */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => router.push('/gallery')} style={{ width: '100%', padding: '13px', background: 'white', color: '#6B5744', border: '1.5px solid #E4D9C8', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: 'pointer' }}>
            🖼️ See what others have made
          </button>
          <button onClick={() => router.push('/')} style={{ width: '100%', padding: '13px', background: 'transparent', color: '#9A8878', border: 'none', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer' }}>
            ← Back to CraftWabi
          </button>
        </div>
      </div>
    </main>
  )
}
