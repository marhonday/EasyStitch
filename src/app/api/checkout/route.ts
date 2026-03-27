import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const stripe = new Stripe(key)

  const body      = await req.json().catch(() => ({}))
  const returnUrl = (body.returnUrl as string | undefined) ?? '/export'

  // Build absolute success / cancel URLs
  const origin     = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const successUrl = `${origin}/unlock/success?session_id={CHECKOUT_SESSION_ID}&return=${encodeURIComponent(returnUrl)}`
  const cancelUrl  = `${origin}${returnUrl}`

  try {
    const session = await stripe.checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency:     'usd',
          unit_amount:  200,   // $2.00 — launch price
          product_data: {
            name:        'EasyStitch — Custom Pattern Download',
            description: 'Your one-of-a-kind stitch pattern generated from your image. Includes full PDF with row-by-row instructions, colour key, and chart. Launch price — $2 today, increasing as features grow.',
            images:      ['https://easystitch.app/icon-512.png'],
          },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url:  cancelUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
