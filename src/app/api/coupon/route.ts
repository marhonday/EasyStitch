/**
 * POST /api/coupon
 * Body: { email: string, tier: '25' | '50' }
 *
 * Creates (or retrieves) the appropriate Stripe coupon and generates a
 * single-use promotion code for the given email address.
 *
 * Tier meanings:
 *   '25' — 25% off, for users who sign up from the progress-tracker page
 *   '50' — 50% off, for users who sign up after completing a purchase
 *
 * Stripe coupon objects are created lazily with stable IDs so they only
 * need to exist once. Promotion codes are always single-use.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Stable Stripe coupon IDs — created once, reused for every promo code
const COUPON_ID: Record<string, string> = {
  '25': 'CraftWabi_tracker_25pct',
  '50': 'CraftWabi_buyer_50pct',
}

const COUPON_DEF: Record<string, { percent_off: number; name: string }> = {
  '25': { percent_off: 25, name: 'CraftWabi — 25% off (progress tracker reward)' },
  '50': { percent_off: 50, name: 'CraftWabi — 50% off (loyalty reward)' },
}

/** Ensure the base coupon exists in Stripe, creating it if needed. */
async function ensureCoupon(stripe: Stripe, tier: string): Promise<string> {
  const id  = COUPON_ID[tier]
  const def = COUPON_DEF[tier]

  try {
    await stripe.coupons.retrieve(id)
    return id
  } catch {
    // Coupon doesn't exist yet — create it
    await stripe.coupons.create({
      id,
      name:        def.name,
      percent_off: def.percent_off,
      duration:    'once',   // applies to a single payment
    })
    return id
  }
}

/** Generate a short uppercase alphanumeric code: e.g. ES25-X7K2M */
function randomSuffix(length = 5): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // no ambiguous 0/O/1/I
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  let email = '', tier = ''
  try {
    const body = await req.json()
    email = (body.email as string | undefined) ?? ''
    tier  = (body.tier  as string | undefined) ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!email || !['25', '50'].includes(tier)) {
    return NextResponse.json({ error: 'Missing or invalid email / tier' }, { status: 400 })
  }

  const stripe = new Stripe(key)

  try {
    const couponId = await ensureCoupon(stripe, tier)

    // Build a readable, unique code:  ES25-XXXXX  or  ES50-XXXXX
    const code = `ES${tier}-${randomSuffix()}`

    // Stripe SDK v21 types require `promotion` but REST API uses `coupon` —
    // cast through unknown to satisfy the type checker while keeping correct behaviour.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promoCode = await (stripe.promotionCodes.create as (p: any) => Promise<any>)({
      coupon:          couponId,
      code,
      max_redemptions: 1,
      metadata:        { email, tier, source: 'discount_club_signup' },
    })

    return NextResponse.json({ code: promoCode.code })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
