'use client'

import { useState } from 'react'

// Create a free Formspree form at formspree.io and paste your form ID here.
// Set the notification email to your address — every sign-up will land in your inbox.
const FORM_ID = 'mykbzdae'

/**
 * couponTier controls the discount incentive shown and generated:
 *   undefined — standard card (no coupon, just email save + discount-club pitch)
 *   '25'      — progress-tracker page: 25% off next pattern
 *   '50'      — post-purchase page: 50% off next pattern (loyalty reward)
 */
export type CouponTier = '25' | '50'

interface Props {
  saveLink?:   string
  linkLabel?:  'pattern' | 'progress'
  maxWidth?:   number
  couponTier?: CouponTier
}

const TIER_COPY: Record<CouponTier, { headline: string; sub: string; perk: string; btn: string }> = {
  '25': {
    headline: 'Get 25% off your next pattern',
    sub:      'You\'re tracking a real project — here\'s a reward for it.',
    perk:     '🎟️ 25% off coupon — emailed instantly when you join',
    btn:      '🎟️ Join free & get 25% off →',
  },
  '50': {
    headline: 'Welcome back — 50% off your next pattern',
    sub:      'Thank you for purchasing. Here\'s a loyalty code for your next one.',
    perk:     '🎟️ 50% off coupon — your loyalty reward, one-time use',
    btn:      '🎟️ Claim my 50% off →',
  },
}

export default function DiscountClubCard({ saveLink, linkLabel = 'pattern', maxWidth = 320, couponTier }: Props) {
  const [email,      setEmail]      = useState('')
  const [status,     setStatus]     = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const valid = /\S+@\S+\.\S+/.test(email)

  const tierCopy = couponTier ? TIER_COPY[couponTier] : null
  const linkWord = linkLabel === 'progress' ? 'progress link' : 'pattern link'

  async function handleJoin() {
    if (!valid || status === 'sending') return
    setStatus('sending')
    try {
      // 1. Capture email via Formspree
      await fetch(`https://formspree.io/f/${FORM_ID}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email,
          type:      couponTier ? `discount_club_${couponTier}pct` : 'discount_club',
          save_link: saveLink ?? '',
        }),
      })

      // 2. If a coupon tier is set, fetch a single-use Stripe promo code server-side
      if (couponTier) {
        try {
          const res  = await fetch('/api/coupon', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, tier: couponTier }),
          })
          const data = await res.json()
          if (data.code) setCouponCode(data.code)
        } catch {
          // Coupon generation failed — still complete the signup
        }
      }

      // 3. Open mail client pre-filled with save link (if provided)
      if (saveLink) {
        const subject = encodeURIComponent('Your CraftWabi save link')
        const body    = encodeURIComponent(
          `Here's your CraftWabi link — tap it to pick up right where you left off:\n\n${saveLink}\n\nHappy stitching! 🧶\n— CraftWabi`
        )
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
      }

      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  /* ── Success state ──────────────────────────────────────────────────────── */
  if (status === 'done') {
    return (
      <div style={{ width: '100%', maxWidth, background: 'white', borderRadius: 18, boxShadow: '0 2px 12px rgba(44,34,24,0.07)', padding: '16px 18px', textAlign: 'center' }}>
        <div style={{ fontSize: 30, marginBottom: 8 }}>{couponTier ? '🎟️' : '💌'}</div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 6 }}>
          {couponTier ? 'You\'re in the club!' : 'Welcome to the Discount Club!'}
        </p>

        {/* Coupon code block */}
        {couponTier && (
          <div style={{
            background: 'rgba(196,97,74,0.07)', border: '1.5px dashed rgba(196,97,74,0.4)',
            borderRadius: 12, padding: '12px 14px', marginBottom: 10,
          }}>
            {couponCode ? (
              <>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Your {couponTier}% off code
                </p>
                <p style={{
                  fontFamily: "'DM Mono', 'Courier New', monospace",
                  fontSize: 20, fontWeight: 700, color: '#C4614A',
                  letterSpacing: '0.12em', marginBottom: 6,
                }}>
                  {couponCode}
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', lineHeight: 1.5 }}>
                  Single-use · enter at checkout · no expiry
                </p>
              </>
            ) : (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4614A', lineHeight: 1.5 }}>
                Your {couponTier}% off code is on its way — check your inbox shortly.
              </p>
            )}
          </div>
        )}

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', lineHeight: 1.6 }}>
          {saveLink
            ? `Your email app should have opened — hit send to save your ${linkWord} to your inbox. We'll send you seasonal discounts too.`
            : "You're on the list. We'll send you seasonal discount codes — one email at a time."}
        </p>
      </div>
    )
  }

  /* ── Default card ───────────────────────────────────────────────────────── */
  return (
    <div style={{ width: '100%', maxWidth, background: 'white', borderRadius: 18, boxShadow: '0 2px 12px rgba(44,34,24,0.07)', padding: '16px 18px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{couponTier ? '🎟️' : '💌'}</span>
        <div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 2 }}>
            {tierCopy ? tierCopy.headline : 'Discount Club — free'}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C4614A', fontWeight: 600 }}>
            {tierCopy ? tierCopy.sub : `Save your ${linkWord} · seasonal discount codes`}
          </p>
        </div>
      </div>

      {/* Perks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
        {tierCopy && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4614A', fontWeight: 600 }}>
            {tierCopy.perk}
          </p>
        )}
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
          : tierCopy
            ? tierCopy.btn
            : saveLink ? `Join & email me my ${linkWord} →` : 'Join the Discount Club →'}
      </button>
    </div>
  )
}
