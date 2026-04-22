'use client'

import { useRouter } from 'next/navigation'

export default function AboutPage() {
  const router = useRouter()
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>

      {/* Header */}
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
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'rgba(44,34,24,0.75)', fontWeight: 600, flex: 1, textAlign: 'center' }}>About</span>
        <div style={{ width: 60 }} />
      </header>

      <div style={{ flex: 1, padding: '8px 24px 60px', maxWidth: 480, margin: '0 auto', width: '100%' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🧶</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#2C2218', marginBottom: 10 }}>
            EasyStitch
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#9A8878', lineHeight: 1.6 }}>
            Turn any photo into a stitch-by-stitch crochet pattern — in seconds, right in your browser.
          </p>
        </div>

        {/* Origin story */}
        <div style={{ background: 'white', borderRadius: 20, padding: '20px 20px', marginBottom: 14, boxShadow: '0 2px 12px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: '#2C2218', marginBottom: 10 }}>
            Why EasyStitch exists
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', lineHeight: 1.8, marginBottom: 10 }}>
            EasyStitch was born out of a real problem. My wife fell in love with C2C crochet and kept running into the same wall — she&apos;d find a photo she wanted to turn into a blanket and there was simply no good way to do it. Existing tools were clunky, produced patterns that looked nothing like the original, or required design software knowledge most crocheters don&apos;t have.
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', lineHeight: 1.8 }}>
            So I built EasyStitch. Upload any photo, crop it, remove the background if needed, pick your blanket size and style, and get a clean ready-to-stitch pattern in seconds. No design background needed. Just your photo, your yarn, and your hook.
          </p>
        </div>

        {/* Feature cards */}
        {[
          { emoji: '🔒', title: '100% private', body: 'All image processing happens locally in your browser. Your photos are never uploaded to any server.' },
          { emoji: '✨', title: 'No account needed', body: 'No sign-up, no subscription. Open the app, upload a photo, and start stitching.' },
          { emoji: '💛', title: 'Built by a crocheter (adjacent)', body: 'EasyStitch is an independent project built for real crafters. It will always be free. Donations help keep it that way.' },
        ].map(card => (
          <div key={card.title} style={{ background: 'white', borderRadius: 20, padding: '16px 20px', marginBottom: 12, boxShadow: '0 2px 12px rgba(44,34,24,0.06)' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{card.emoji}</span>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 5 }}>{card.title}</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', lineHeight: 1.7 }}>{card.body}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Contact */}
        <div style={{ background: 'rgba(196,97,74,0.06)', borderRadius: 16, padding: '14px 18px', marginBottom: 20, border: '1px solid rgba(196,97,74,0.15)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', lineHeight: 1.7 }}>
            Questions or feedback?{' '}
            <a href="mailto:Support@easystitch.org" style={{ color: '#C4614A', fontWeight: 600, textDecoration: 'none' }}>
              Support@easystitch.org
            </a>
          </p>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => router.push('/gallery')} style={{ width: '100%', padding: '14px', background: 'white', border: '1.5px solid #E4D9C8', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', cursor: 'pointer' }}>
            🖼️ Community Gallery
          </button>
          <button onClick={() => router.push('/faq')} style={{ width: '100%', padding: '14px', background: 'white', border: '1.5px solid #E4D9C8', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', cursor: 'pointer' }}>
            ❓ FAQ
          </button>
          <button onClick={() => router.push('/donate')} style={{ width: '100%', padding: '14px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(196,97,74,0.25)' }}>
            ☕ Support EasyStitch
          </button>
        </div>
      </div>
    </main>
  )
}
