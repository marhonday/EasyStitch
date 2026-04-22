'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const FAQS = [
  {
    q: "What's the difference between C2C and Single Crochet?",
    a: "Corner-to-Corner (C2C) builds your blanket diagonally — you start at one corner and work toward the opposite, adding and decreasing squares as you go. It creates a slightly textured diagonal look and is very popular for graphghans. Single Crochet works in straight horizontal rows, giving you a tighter, denser fabric that captures fine detail really well.",
  },
  {
    q: 'Which style works best for a pet or portrait photo?',
    a: "Single Crochet generally gives you more detail since each stitch is smaller and rows are straight — faces and fine features come through more clearly. C2C is great for bolder designs, logos, and patterns with strong color blocks.",
  },
  {
    q: 'What yarn works best?',
    a: "A smooth worsted weight yarn in 100% acrylic gives the cleanest color definition and is easiest to work with. Avoid fuzzy or textured yarns — they obscure the pattern. Lion Brand Pound of Love, Red Heart Super Saver, and Caron Simply Soft are all popular choices.",
  },
  {
    q: 'What size should I pick?',
    a: "Baby (40×50) is great for testing a new pattern before committing to a full blanket. Throw (65×80) is the most popular all-purpose size. Queen (100×120) gives you the most detail but requires significantly more yarn and time.",
  },
  {
    q: 'How many colors should I use?',
    a: "Less is usually more — 4 to 6 colors tend to produce the clearest patterns. Too many colors makes the pattern hard to follow and requires constant yarn changes. For logos or simple graphics, 2 to 4 colors is ideal. For pet portraits, 5 to 8 works well.",
  },
  {
    q: 'What photos work best?',
    a: "Photos with good contrast and a clear subject against a simple background work best. Close-up portraits of pets or people, logos, and bold graphic designs all generate great patterns. Use the crop and background removal tools to help clean up busy backgrounds or low-light photos.",
  },
  {
    q: 'Will my pattern be lost if I navigate away?',
    a: "No — EasyStitch automatically saves your current pattern in your browser session. You can switch to My Patterns, FAQ, or anywhere else and come right back — your pattern will still be there. It is only cleared when you tap \"Make Another Pattern\" or close the browser tab.",
  },
  {
    q: 'Are more styles coming?',
    a: "Yes! We're working on additional stitch styles and export options. If there's a feature you'd love to see, let us know — EasyStitch is built around real crocheters' needs and your feedback shapes what we build next.",
  },
  {
    q: 'Are my photos stored or shared?',
    a: "Never. All processing happens entirely in your browser. Your photos are not uploaded to any server and are not stored anywhere outside your own device.",
  },
  {
    q: 'How do I contact you?',
    a: "Email us at Support@easystitch.org — we read every message.",
  },
]

export default function FaqPage() {
  const router = useRouter()
  const [open, setOpen] = useState<number | null>(null)

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
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'rgba(44,34,24,0.75)', fontWeight: 600, flex: 1, textAlign: 'center' }}>FAQ</span>
        <div style={{ width: 60 }} />
      </header>

      <div style={{ flex: 1, padding: '8px 20px 60px', maxWidth: 480, margin: '0 auto', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 27, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
            Frequently Asked Questions
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878' }}>
            Tap a question to expand it.
          </p>
        </div>

        {FAQS.map((item, i) => (
          <div
            key={i}
            style={{ background: 'white', borderRadius: 16, marginBottom: 10, boxShadow: '0 1px 6px rgba(44,34,24,0.06)', overflow: 'hidden' }}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
                color: open === i ? '#C4614A' : '#2C2218', textAlign: 'left', gap: 12,
              }}
            >
              <span style={{ flex: 1 }}>{item.q}</span>
              <span style={{
                fontSize: 20, flexShrink: 0, color: '#C4614A',
                display: 'inline-block',
                transition: 'transform 0.2s',
                transform: open === i ? 'rotate(45deg)' : 'none',
              }}>+</span>
            </button>
            {open === i && (
              <div style={{ padding: '0 18px 16px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', lineHeight: 1.8 }}>
                {item.a}
              </div>
            )}
          </div>
        ))}

        {/* Still have questions */}
        <div style={{ background: 'rgba(196,97,74,0.06)', borderRadius: 16, padding: '16px 18px', margin: '20px 0', border: '1px solid rgba(196,97,74,0.15)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: '#C4614A', marginBottom: 4 }}>Still have a question?</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', lineHeight: 1.7 }}>
            Reach out at{' '}
            <a href="mailto:Support@easystitch.org" style={{ color: '#C4614A', fontWeight: 600, textDecoration: 'none' }}>
              Support@easystitch.org
            </a>
            {' '}— we read every message.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => router.push('/donate')} style={{ width: '100%', padding: '14px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(196,97,74,0.25)' }}>
            ☕ Support EasyStitch
          </button>
          <button onClick={() => router.push('/about')} style={{ width: '100%', padding: '13px', background: 'white', color: '#6B5744', border: '1.5px solid #E4D9C8', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: 'pointer' }}>
            About EasyStitch
          </button>
        </div>
      </div>
    </main>
  )
}
