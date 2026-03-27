import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createHmac } from 'crypto'

// ── Replay protection ─────────────────────────────────────────────────────────
// In-process set of already-claimed session IDs.
// Fine for a single-server / serverless-with-warm-instance deployment.
// For multi-region production, swap this for a Redis SET with TTL.
const claimedSessions = new Set<string>()

function signToken(sessionId: string, plan: string): string {
  const secret = process.env.UNLOCK_TOKEN_SECRET ?? process.env.STRIPE_SECRET_KEY ?? 'fallback'
  return createHmac('sha256', secret).update(`${plan}:${sessionId}`).digest('hex')
}

export async function GET(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  // Reject replayed sessions — each session can only mint a token once
  if (claimedSessions.has(sessionId)) {
    return NextResponse.json({ error: 'Session already used' }, { status: 409 })
  }

  const stripe = new Stripe(key)

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not complete' }, { status: 402 })
    }

    // Determine plan from metadata (default = 'single' — one pattern, 6 hrs)
    const plan      = (session.metadata?.plan as string | undefined) ?? 'single'
    const TTL_MS    = plan === 'single'
      ? 6 * 60 * 60 * 1000          // 6 hours — single pattern
      : 30 * 24 * 60 * 60 * 1000    // 30 days  — monthly (future)

    const paidAt    = Date.now()
    const expiresAt = paidAt + TTL_MS
    const token     = signToken(sessionId, plan)

    // Mark session as claimed so it can't be replayed
    claimedSessions.add(sessionId)

    return NextResponse.json({ token, plan, paidAt, expiresAt })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
