'use client'

import { useState } from 'react'

// Create a free Formspree form at formspree.io and paste your form ID here.
// Set the notification email to your address — every sign-up will land in your inbox.
const FORM_ID = 'YOUR_FORMSPREE_ID'

interface Props {
  saveLink?: string        // URL to pre-fill the mailto — pattern link or tracker URL
  linkLabel?: 'pattern' | 'progress'
  maxWidth?: number
}

export default function DiscountClubCard({ saveLink, linkLabel = 'pattern', maxWidth = 320 }: Props) {
  const [email,  setEmail]  = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const valid = /\S+@\S+\.\S+/.test(email)

  async function handleJoin() {
    if (!valid || status === 'sending') return
    setStatus('sending')
    try {
      await fetch(`https://formspree.io/f/${FORM_ID}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, type: 'discount_club', save_link: saveLink ?? '' }),
      })
      // Open mail client pre-filled with their save link so it lands in their inbox
      if (saveLink) {
        const subject = encodeURIComponent('Your EasyStitch save link')
        const body    = encodeURIComponent(
          `Here's your EasyStitch link — tap it to pick up right where you left off:\n\n${saveLink}\n\nHappy stitching! 🧶\n— EasyStitch`
        )
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
      }
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  const linkWord = linkLabel === 'progress' ? 'progress link' : 'pattern link'

  if (status === 'done') {
    return (
      <div style={{ width: '100%', maxWidth, background: 'white', borderRadius: 18, boxShadow: '0 2px 12px rgba(44,34,24,0.07)', padding: '16px 18px', textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>💌</div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 4 }}>
          Welcome to the Discount Club!
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', lineHeight: 1.6 }}>
          {saveLink
            ? `Your email app should have opened — hit send to save your ${linkWord} to your inbox. We'll send you seasonal discounts too.`
            : "You're on the list. We'll send you seasonal discount codes — one email at a time."}
        </p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth, background: 'white', borderRadius: 18, boxShadow: '0 2px 12px rgba(44,34,24,0.07)', padding: '16px 18px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>💌</span>
        <div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 2 }}>
            Discount Club — free
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C4614A', fontWeight: 600 }}>
            Save your {linkWord} · seasonal discount codes
          </p>
        </div>
      </div>

      {/* Perks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
        {saveLink && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>
            ✓ Your {linkWord} emailed to you — resume on any device
          </p>
        )}
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>
          ✓ Seasonal discount codes (holidays, launches &amp; more)
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>
          ✓ One email at a time — unsubscribe in one click
        </p>
      </div>

      {/* Input */}
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleJoin()}
        placeholder="your@email.com"
        style={{
          width: '100%', padding: '11px 12px', boxSizing: 'border-box',
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#2C2218',
          background: '#FAF6EF', border: '1.5px solid #E4D9C8',
          borderRadius: 10, outline: 'none', marginBottom: 8,
        }}
      />

      {status === 'error' && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4614A', marginBottom: 8 }}>
          Something went wrong — try again or email us directly.
        </p>
      )}

      <button
        onClick={handleJoin}
        disabled={!valid || status === 'sending'}
        style={{
          width: '100%', padding: '11px', border: 'none',
          background: valid && status !== 'sending' ? '#C4614A' : '#E4D9C8',
          color:      valid && status !== 'sending' ? 'white'   : '#B8AAA0',
          borderRadius: 10, fontFamily: "'DM Sans', sans-serif",
          fontSize: 13, fontWeight: 600,
          cursor: valid && status !== 'sending' ? 'pointer' : 'not-allowed',
        }}
      >
        {status === 'sending'
          ? 'Joining…'
          : saveLink ? `Join & email me my ${linkWord} →` : 'Join the Discount Club →'}
      </button>
    </div>
  )
}
