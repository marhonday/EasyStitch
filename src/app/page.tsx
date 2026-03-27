'use client'

import Link from 'next/link'
import { useState } from 'react'

// ── Gallery items ──────────────────────────────────────────────────────────────
// 1. Drop your images into /public/gallery/
// 2. Update the `before` and `after` paths below.
//    before = the original photo file  (e.g. /gallery/cat-photo.jpg)
//    after  = screenshot of the pattern preview  (e.g. /gallery/cat-pattern.jpg)
// Leave a path as '' to show a placeholder card until you have the image.
const GALLERY_ITEMS: { style: string; subject: string; before: string; after: string }[] = [
  { style: 'Single Crochet', subject: 'Pet portrait',      before: '', after: '' },
  { style: 'Cross Stitch',   subject: 'Floral close-up',   before: '', after: '' },
  { style: 'Tapestry',       subject: 'Bold graphic',      before: '', after: '' },
  { style: 'C2C',            subject: 'Portrait',          before: '', after: '' },
  { style: 'Filet Crochet',  subject: 'Animal silhouette', before: '', after: '' },
  { style: 'Knitting',       subject: 'Geometric motif',   before: '', after: '' },
]

// ── Style guide ────────────────────────────────────────────────────────────────
const STYLE_GUIDE = [
  {
    icon: '▦',
    name: 'Single Crochet',
    fit: 'great' as const,
    description: 'Tight square grid — the most forgiving style. Pets, portraits, landscapes all work.',
    bestFor: 'Pets · portraits · almost any photo',
    watchOut: null,
  },
  {
    icon: '✚',
    name: 'Cross Stitch',
    fit: 'great' as const,
    description: 'Fine grid, many thread colors. Handles the most detail of any style — very forgiving.',
    bestFor: 'Florals · portraits · detailed images',
    watchOut: null,
  },
  {
    icon: '⬛',
    name: 'Tapestry Crochet',
    fit: 'ok' as const,
    description: 'Yarn carried across each row. Beautiful for motifs but struggles with scattered color pops.',
    bestFor: 'Geometric · repeating patterns',
    watchOut: 'Lots of isolated color pops across a row',
  },
  {
    icon: '◪',
    name: 'C2C',
    fit: 'ok' as const,
    description: 'Corner-to-corner diagonal blocks. Great for bold shapes — the diagonal bias can distort faces.',
    bestFor: 'Bold shapes · diagonal compositions',
    watchOut: 'Straight portraits — diagonal bias distorts faces',
  },
  {
    icon: '🔲',
    name: 'Filet Crochet',
    fit: 'selective' as const,
    description: 'Black-and-white open mesh only. Needs a strong, clean silhouette to read well.',
    bestFor: 'High-contrast silhouettes · outlines',
    watchOut: 'Gradients, complex interiors, busy backgrounds',
  },
  {
    icon: '◈',
    name: 'Mosaic Crochet',
    fit: 'selective' as const,
    description: 'Two-color slip-stitch technique. Stunning for geometric designs — real photos mostly collapse.',
    bestFor: 'Logos · 2–3 color graphics · geometric shapes',
    watchOut: 'Real photos — color complexity collapses to noise',
  },
  {
    icon: '🧵',
    name: 'Knitting',
    fit: 'selective' as const,
    description: 'Stranded or intarsia colorwork. Works beautifully for fairisle motifs and geometric repeats.',
    bestFor: 'Repeating motifs · geometric · fairisle',
    watchOut: 'Organic photos — needs strong simplification first',
  },
]

// ── Photo tips ─────────────────────────────────────────────────────────────────
const PHOTO_TIPS = [
  {
    icon: '🎯',
    title: 'One clear subject',
    body: 'A face, pet, or object that fills most of the frame. Busy scenes compete with themselves at stitch resolution.',
  },
  {
    icon: '☀️',
    title: 'Good contrast & light',
    body: 'Even natural light, no harsh shadows cutting through your subject. Contrast is what the engine reads.',
  },
  {
    icon: '✂️',
    title: 'Crop close',
    body: 'A tight crop beats a wide landscape every time. Fine detail that survives at 80 stitches wide is rare.',
  },
  {
    icon: '⚠️',
    title: 'Complex photos need large grids',
    body: 'A train, crowd, or busy scene won\'t simplify cleanly at Small or Medium grid — go Large or Expert.',
  },
]

const FIT_COLORS = {
  great:     { bg: 'rgba(34,197,94,0.10)',  text: '#16a34a', dot: '#22c55e', label: 'Great for most photos'       },
  ok:        { bg: 'rgba(234,179,8,0.10)',  text: '#b45309', dot: '#f59e0b', label: 'Works best with specific types' },
  selective: { bg: 'rgba(239,68,68,0.10)',  text: '#dc2626', dot: '#ef4444', label: 'Needs the right photo'        },
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px 32px', textAlign: 'center' }}>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(196,97,74,0.10)', color: '#C4614A',
          borderRadius: 999, padding: '6px 14px',
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
          marginBottom: 20,
        }}>
          🧶 Free to start · no account needed
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 34, fontWeight: 700,
          color: '#2C2218', lineHeight: 1.2,
          marginBottom: 12, maxWidth: 320,
        }}>
          Turn any photo into<br />
          <span style={{ color: '#C4614A' }}>a stitch pattern.</span>
        </h1>

        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 15, color: '#3D2C1E',
          lineHeight: 1.65, maxWidth: 290,
          marginBottom: 32,
        }}>
          Upload a pet, portrait, or favourite memory — pick your style and get a colour-by-colour pattern instantly.
        </p>

        {/* ── Style cards ─────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 8 }}>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700,
            color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 14, textAlign: 'left',
          }}>
            What are you making?
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <StyleCard href="/upload?style=singleCrochet" icon="▦" title="Single Crochet" tags={['Beginner friendly', 'Row by row']} />
            <StyleCard href="/upload?style=tapestry"      icon="⬛" title="Tapestry Crochet" tags={['Multi-colour', 'Carry yarn']} />
            <StyleCard href="/upload?style=c2c"           icon="◪" title="C2C Crochet"      tags={['Corner to corner', 'Diagonal']} />
            <StyleCard href="/upload?style=mosaic"        icon="◈" title="Mosaic Crochet"   tags={['2 colours', 'Slip stitch']} />
            <StyleCard href="/knitting"  icon="🧵" title="Knitting"       tags={['Fair Isle', 'Intarsia']}       badge="New" />
            <StyleCard href="/filet"     icon="🔲" title="Filet Crochet"  tags={['Open mesh', 'Filled grid']}    badge="New" />
            <StyleCard href="/crossstitch" icon="✚" title="Cross Stitch" tags={['Embroidery', 'Aida cloth']}    badge="New" />
            <StyleCard icon="💎" title="Diamond Painting" tags={['Bead counts', 'Colour codes']} comingSoon />
          </div>
        </div>

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C8BFB0', marginTop: 12 }}>
          Upload your photo · pick your style · download your pattern
        </p>
      </section>

      <Divider />

      {/* ── Which style is right for me? ──────────────────────────────────── */}
      <section style={{ width: '100%', maxWidth: 440, padding: '32px 20px' }}>
        <SectionLabel>Which style is right for me?</SectionLabel>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.6, marginBottom: 20, maxWidth: 380 }}>
          Each style has a sweet spot. Here&apos;s an honest breakdown so you pick the one that&apos;ll actually work with your photo.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STYLE_GUIDE.map(s => {
            const fc = FIT_COLORS[s.fit]
            return (
              <div key={s.name} style={{
                background: 'white', borderRadius: 14,
                border: '1.5px solid #EDE4D8',
                padding: '14px 16px',
                boxShadow: '0 1px 4px rgba(44,34,24,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{s.icon}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218' }}>{s.name}</span>
                  </div>
                  <span style={{
                    flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: fc.bg, borderRadius: 999, padding: '3px 10px',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: fc.text,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: fc.dot, display: 'inline-block', flexShrink: 0 }} />
                    {fc.label}
                  </span>
                </div>

                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', lineHeight: 1.5, marginBottom: s.watchOut ? 8 : 0 }}>
                  {s.description}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#16a34a' }}>
                    ✓ Best for: {s.bestFor}
                  </p>
                  {s.watchOut && (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#b45309' }}>
                      ⚠ Watch out for: {s.watchOut}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <Divider />

      {/* ── What makes a great pattern photo ─────────────────────────────── */}
      <section style={{ width: '100%', maxWidth: 440, padding: '32px 20px' }}>
        <SectionLabel>What makes a great pattern photo</SectionLabel>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.6, marginBottom: 20, maxWidth: 380 }}>
          The engine is powerful but works best when the photo gives it clear information to work with.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {PHOTO_TIPS.map(tip => (
            <div key={tip.title} style={{
              background: 'white', borderRadius: 14,
              border: '1.5px solid #EDE4D8', padding: '14px',
              boxShadow: '0 1px 4px rgba(44,34,24,0.05)',
            }}>
              <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>{tip.icon}</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218', marginBottom: 5 }}>
                {tip.title}
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', lineHeight: 1.5 }}>
                {tip.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── Gallery ───────────────────────────────────────────────────────── */}
      <section style={{ width: '100%', padding: '32px 0' }}>
        <div style={{ maxWidth: 440, margin: '0 auto', paddingLeft: 20, paddingRight: 20 }}>
          <SectionLabel>Photos we&apos;ve turned into patterns</SectionLabel>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.6, marginBottom: 20, maxWidth: 380 }}>
            Here&apos;s what real photos look like once the engine processes them. Swipe to see more.
          </p>
        </div>

        {/* Horizontal scroll container */}
        <div style={{
          display: 'flex', overflowX: 'auto', gap: 12,
          paddingLeft: 20, paddingRight: 20, paddingBottom: 8,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          // hide scrollbar
          msOverflowStyle: 'none',
        }}>
          {GALLERY_ITEMS.map((item, i) => (
            <GalleryCard key={i} {...item} />
          ))}
        </div>

        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>
      </section>

      <Divider />

      {/* ── Feedback ──────────────────────────────────────────────────────── */}
      <section style={{ width: '100%', maxWidth: 440, padding: '32px 20px' }}>
        <SectionLabel>We&apos;re constantly improving</SectionLabel>

        <div style={{
          background: 'white', borderRadius: 18,
          border: '1.5px solid #EDE4D8',
          padding: '22px 20px',
          boxShadow: '0 1px 6px rgba(44,34,24,0.06)',
        }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
            Pattern didn&apos;t come out right?
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', lineHeight: 1.6, marginBottom: 20 }}>
            Send us the photo and describe what you were going for. We look at every submission and may be able to get it pattern-ready — or use it to improve the engine for everyone.
          </p>
          <FeedbackForm />
        </div>
      </section>

      <Divider />

      {/* ── Coming soon ───────────────────────────────────────────────────── */}
      <section style={{ width: '100%', maxWidth: 440, padding: '32px 20px 48px' }}>
        <SectionLabel>Coming soon</SectionLabel>

        <div style={{
          background: 'white', borderRadius: 16,
          border: '1.5px dashed #D4C9B8', padding: '18px 16px',
          display: 'flex', alignItems: 'center', gap: 14,
          opacity: 0.75,
        }}>
          <span style={{ fontSize: 36 }}>💎</span>
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 3 }}>
              Diamond Painting
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', lineHeight: 1.4 }}>
              Bead counts, color codes, and printable placement charts — same photo-to-pattern magic.
            </p>
          </div>
          <span style={{
            flexShrink: 0, fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700,
            color: '#B8AAA0', background: '#EDE8E0',
            borderRadius: 999, padding: '3px 9px',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Soon
          </span>
        </div>
      </section>

    </main>
  )
}

// ── Section helpers ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700,
      color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: 10,
    }}>
      {children}
    </p>
  )
}

function Divider() {
  return (
    <div style={{ width: '100%', maxWidth: 440, padding: '0 20px' }}>
      <div style={{ height: 1, background: '#EDE4D8' }} />
    </div>
  )
}

// ── Gallery card ───────────────────────────────────────────────────────────────

function GalleryCard({ style, subject, before, after }: {
  style: string; subject: string; before: string; after: string
}) {
  const hasImages = before !== '' && after !== ''

  return (
    <div style={{
      flexShrink: 0, width: 280,
      borderRadius: 16, overflow: 'hidden',
      border: '1.5px solid #EDE4D8',
      background: 'white',
      boxShadow: '0 2px 8px rgba(44,34,24,0.06)',
      scrollSnapAlign: 'start',
    }}>
      {/* Before / After images */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 160 }}>
        {/* Before */}
        <div style={{ position: 'relative', borderRight: '1px solid #EDE4D8' }}>
          {hasImages ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={before} alt={`${subject} original photo`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: '#F5F0E8',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 28 }}>📷</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#C8BFB0' }}>Photo</span>
            </div>
          )}
          <span style={{
            position: 'absolute', bottom: 6, left: 6,
            fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700,
            color: 'white', background: 'rgba(44,34,24,0.55)',
            borderRadius: 999, padding: '2px 7px',
          }}>
            Before
          </span>
        </div>

        {/* After */}
        <div style={{ position: 'relative' }}>
          {hasImages ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={after} alt={`${subject} pattern`} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: '#FAF6EF',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 28 }}>🧶</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#C8BFB0' }}>Pattern</span>
            </div>
          )}
          <span style={{
            position: 'absolute', bottom: 6, right: 6,
            fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700,
            color: 'white', background: 'rgba(196,97,74,0.75)',
            borderRadius: 999, padding: '2px 7px',
          }}>
            After
          </span>
        </div>
      </div>

      {/* Label */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, color: '#2C2218' }}>{subject}</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>{style}</p>
        </div>
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700,
          color: '#C4614A', background: 'rgba(196,97,74,0.10)',
          borderRadius: 999, padding: '3px 9px',
          textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
        }}>
          {style.split(' ')[0]}
        </span>
      </div>
    </div>
  )
}

// ── Feedback form ──────────────────────────────────────────────────────────────
// To receive submissions in Gmail:
//   1. Go to https://formspree.io and create a free account
//   2. Create a new form — set the notification email to your Gmail
//   3. Copy your form ID (looks like "xpwzabcd") and replace YOUR_FORM_ID below
const FORMSPREE_ID = 'mykbzdae'

function FeedbackForm() {
  const [email,   setEmail]   = useState('')
  const [message, setMessage] = useState('')
  const [status,  setStatus]  = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setStatus('sending')
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, message }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div style={{
        background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
        borderRadius: 12, padding: '16px',
        fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#16a34a',
        textAlign: 'center',
      }}>
        ✓ Got it — thank you! We&apos;ll take a look.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        type="email"
        placeholder="Your email (optional — only if you want a reply)"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{
          padding: '12px 14px', borderRadius: 12,
          border: '1.5px solid #E4D9C8',
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218',
          background: '#FAF6EF', outline: 'none',
        }}
      />
      <textarea
        placeholder="Tell us what photo you used, which style, and what went wrong. A screenshot or link to your photo is super helpful."
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={4}
        required
        style={{
          padding: '12px 14px', borderRadius: 12,
          border: '1.5px solid #E4D9C8',
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218',
          background: '#FAF6EF', resize: 'none', outline: 'none',
          lineHeight: 1.5,
        }}
      />
      {status === 'error' && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4614A' }}>
          Something went wrong — try again or email us directly.
        </p>
      )}
      <button
        type="submit"
        disabled={status === 'sending' || !message.trim()}
        style={{
          padding: '13px 20px', borderRadius: 12, border: 'none',
          background: message.trim() && status !== 'sending' ? '#C4614A' : '#E4D9C8',
          color: message.trim() && status !== 'sending' ? 'white' : '#B8AAA0',
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
          cursor: message.trim() && status !== 'sending' ? 'pointer' : 'not-allowed',
          transition: 'background 0.15s',
        }}
      >
        {status === 'sending' ? 'Sending…' : 'Send feedback →'}
      </button>
    </form>
  )
}

// ── Style card ─────────────────────────────────────────────────────────────────

function StyleCard({
  href, icon, title, tags, badge, comingSoon,
}: {
  href?:       string
  icon:        string
  title:       string
  tags:        string[]
  badge?:      string
  comingSoon?: boolean
}) {
  const card = (
    <div style={{
      background:    comingSoon ? '#FAFAFA' : 'white',
      borderRadius:  16,
      border:        comingSoon ? '1.5px solid #EDE8E0' : '1.5px solid #E4D9C8',
      padding:       '16px 14px',
      boxShadow:     comingSoon ? 'none' : '0 2px 8px rgba(44,34,24,0.05)',
      opacity:       comingSoon ? 0.5 : 1,
      cursor:        comingSoon ? 'not-allowed' : 'pointer',
      height:        '100%',
      boxSizing:     'border-box' as const,
      textAlign:     'left' as const,
      display:       'flex',
      flexDirection: 'column' as const,
      gap:           8,
      transition:    'box-shadow 0.15s ease, border-color 0.15s ease',
    }}>
      <div style={{ fontSize: 28 }}>{icon}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14,
          color: comingSoon ? '#9A8878' : '#2C2218',
        }}>
          {title}
        </p>
        {badge && (
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700,
            color: '#C4614A', background: 'rgba(196,97,74,0.10)',
            borderRadius: 999, padding: '2px 7px',
            textTransform: 'uppercase' as const, letterSpacing: '0.04em',
          }}>
            {badge}
          </span>
        )}
        {comingSoon && (
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700,
            color: '#B8AAA0', background: '#EDE8E0',
            borderRadius: 999, padding: '2px 7px',
            textTransform: 'uppercase' as const, letterSpacing: '0.04em',
          }}>
            Soon
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
        {tags.map(tag => (
          <span key={tag} style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 10,
            color: '#9A8878', background: '#F5F0E8',
            borderRadius: 999, padding: '2px 8px',
          }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  )

  if (comingSoon || !href) return card

  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      {card}
    </Link>
  )
}
