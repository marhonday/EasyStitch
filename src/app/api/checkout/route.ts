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
  const tier      = (body.tier as string | undefined) === 'graphic' ? 'graphic' : 'photo'

  const unitAmount  = 300   // $3 flat for all pattern downloads
  const productName = 'CraftWabi — Pattern Download'
  const productDesc = 'Custom stitch pattern generated from your image. Full PDF with chart, colour key, and row-by-row instructions.'

  // Build absolute success / cancel URLs
  const origin     = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const successUrl = `${origin}/unlock/success?session_id={CHECKOUT_SESSION_ID}&return=${encodeURIComponent(returnUrl)}`
  const cancelUrl  = `${origin}${returnUrl}`

  try {
    const session = await stripe.checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      allow_promotion_codes: true,   // lets users enter discount codes at checkout
      line_items: [{
        price_data: {
          currency:    'usd',
          unit_amount: unitAmount,
          product_data: {
            name:        productName,
            description: productDesc,
            images:      ['https://craftwabi.com/icon-512.png'],
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
