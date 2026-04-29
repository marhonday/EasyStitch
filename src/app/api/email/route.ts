import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { email, pattern_name, restore_link } = await req.json()

    if (!email || !restore_link) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    await resend.emails.send({
      from:    'CraftWabi <noreply@craftwabi.com>',
      to:      email,
      subject: `Your pattern link — ${pattern_name ?? 'My Pattern'}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#FAF6EF;border-radius:16px">
          <h2 style="font-family:Georgia,serif;color:#2C2218;margin:0 0 12px">🧶 Your pattern link</h2>
          <p style="color:#6B5744;margin:0 0 20px;line-height:1.6">
            Here's your saved link for <strong>${pattern_name ?? 'your pattern'}</strong>.
            Tap it any time to pick up right where you left off.
          </p>
          <a href="${restore_link}"
             style="display:inline-block;padding:14px 24px;background:#C4614A;color:white;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">
            Continue tracking →
          </a>
          <p style="color:#C8BFB0;font-size:12px;margin:24px 0 0">
            craftwabi.com — free crochet pattern tracker
          </p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Email send error:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
