'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { setUnlockRecord } from '@/lib/unlock'
import DiscountClubCard from '@/components/ui/DiscountClubCard'

function SuccessInner() {
  const searchParams = useSearchParams()
  const nav          = useRouter()
  const sessionId    = searchParams.get('session_id')
  const returnUrl    = searchParams.get('return') ?? '/export'
  const [status, setStatus] = useState<'verifying' | 'done' | 'error'>('verifying')

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return }

    fetch(`/api/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.token) {
          setUnlockRecord({
            token:     data.token,
            plan:      data.plan ?? 'single',
            paidAt:    data.paidAt    ?? Date.now(),
            expiresAt: data.expiresAt ?? (Date.now() + 6 * 60 * 60 * 1000),
          })
          setStatus('done')
          setTimeout(() => nav.replace(returnUrl), 1800)
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [sessionId, returnUrl, nav])

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      {status === 'verifying' && (
        <>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #E4D9C8', borderTopColor: '#C4614A', animation: 'spin 0.8s linear infinite', marginBottom: 20 }} />
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#6B5744' }}>Confirming your payment…</p>
        </>
      )}
      {status === 'done' && (
        <>
          <div style={{ fontSize: 52, marginBottom: 16 }}>??</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
            You&apos;re unlocked!
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', marginBottom: 24 }}>
            Taking you to your pattern now…
          </p>
          {/* 50% loyalty reward for buyers */}
          <div style={{ width: '100%', maxWidth: 360 }}>
            <DiscountClubCard couponTier="50" />
          </div>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ fontSize: 40, marginBottom: 16 }}>??</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', marginBottom: 20 }}>
            Your payment may have gone through — please contact support@craftwabi.com and we&apos;ll sort it out.
          </p>
          <button
            onClick={() => nav.replace(returnUrl)}
            style={{ padding: '12px 24px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Continue anyway
          </button>
        </>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </main>
  )
}

export default function UnlockSuccessPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #E4D9C8', borderTopColor: '#C4614A', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </main>
    }>
      <SuccessInner />
    </Suspense>
  )
}
