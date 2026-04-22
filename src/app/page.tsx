'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()

  return (
    <main style={{
      minHeight: '100vh',
      background: '#FAF6EF',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header style={{
        width: '100%', maxWidth: 480,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'max(20px, env(safe-area-inset-top)) 20px 0',
      }}>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 22, fontWeight: 700,
          color: '#2C2218',
        }}>
          CraftWabi 🧶
        </span>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section style={{
        width: '100%', maxWidth: 440,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 20px 12px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(196,97,74,0.10)', color: '#C4614A',
          borderRadius: 999, padding: '6px 14px',
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
          marginBottom: 18,
        }}>
          Free · no account · no download needed
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 32, fontWeight: 700,
          color: '#2C2218', lineHeight: 1.2,
          marginBottom: 12, maxWidth: 320,
        }}>
          Your all-in-one<br />
          <span style={{ color: '#C4614A' }}>crochet &amp; stitch studio.</span>
        </h1>

        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14, color: '#6B5744',
          lineHeight: 1.65, maxWidth: 300,
          marginBottom: 8,
        }}>
          Browse ready-made patterns, convert any photo into a stitch chart, or track a project row by row — all free.
        </p>
      </section>

      {/* ── 3 main paths ───────────────────────────────────────────────────── */}
      <section style={{ width: '100%', maxWidth: 440, padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Browse Patterns */}
        <PathCard
          href="/shop"
          emoji="🛍️"
          title="Browse Ready-Made Patterns"
          description="Pre-gridded designs — football blankets, dog breeds, holidays &amp; more. Pick your size, add a name, download instantly."
          badge="Shop"
          badgeColor="#C4614A"
          accent="#C4614A"
        />

        {/* Convert a Photo */}
        <PathCard
          href="/create"
          emoji="📸"
          title="Convert Your Photo"
          description="Turn any photo into a C2C graphgan, cross-stitch chart, knitting colorwork, and more. Free, in seconds."
          badge="Free"
          badgeColor="#16a34a"
          accent="#2C7A4B"
        />

        {/* Track Progress */}
        <PathCard
          href="/track"
          emoji="📋"
          title="Track Your Progress"
          description="Upload any pattern — graphgan, cross-stitch, or knitting — and follow it row by row with colour guides."
          badge="Free counter"
          badgeColor="#7C5CBF"
          accent="#7C5CBF"
        />

      </section>

      {/* ── Free row counter card ─────────────────────────────────────────── */}
      <section style={{ width: '100%', maxWidth: 440, padding: '20px 20px 0' }}>
        <div style={{ height: 1, background: '#EDE4D8', marginBottom: 20 }} />

        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700,
          color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: 12,
        }}>
          Start a project right now — free
        </p>

        <Link href="/track/upload" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            background: 'white', borderRadius: 18,
            border: '1.5px solid #C4614A',
            padding: '18px 16px',
            boxShadow: '0 3px 16px rgba(196,97,74,0.13)',
            display: 'flex', alignItems: 'center', gap: 16,
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 5px 22px rgba(196,97,74,0.20)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 3px 16px rgba(196,97,74,0.13)')}
          >
            <div style={{
              width: 54, height: 54, borderRadius: 14, flexShrink: 0,
              background: 'rgba(196,97,74,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26,
            }}>
              📋
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: '#2C2218' }}>
                  Free Crochet Row Counter
                </p>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700,
                  color: '#7C5CBF', background: 'rgba(124,92,191,0.10)',
                  borderRadius: 999, padding: '2px 8px',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  Free
                </span>
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', lineHeight: 1.45 }}>
                Upload any pattern chart and track every row with live colour guidance — no account needed.
              </p>
            </div>
            <span style={{ fontSize: 18, color: '#C4614A', flexShrink: 0 }}>→</span>
          </div>
        </Link>
      </section>

      {/* ── Quick links row ───────────────────────────────────────────────── */}
      <section style={{ width: '100%', maxWidth: 440, padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Gallery',  path: '/gallery', emoji: '🖼️' },
            { label: 'FAQ',      path: '/faq',     emoji: '❓' },
            { label: 'About',    path: '/about',   emoji: 'ℹ️' },
            { label: 'Donate',   path: '/donate',  emoji: '☕' },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px',
                background: 'white', border: '1.5px solid #E4D9C8',
                borderRadius: 999,
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744',
                cursor: 'pointer',
              }}
            >
              <span>{item.emoji}</span> {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Bottom padding for faith footer ──────────────────────────────── */}
      <div style={{ height: 60 }} />

    </main>
  )
}

// ── Path card ──────────────────────────────────────────────────────────────────

function PathCard({
  href, emoji, title, description, badge, badgeColor, accent,
}: {
  href: string
  emoji: string
  title: string
  description: string
  badge: string
  badgeColor: string
  accent: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: 'white', borderRadius: 18,
          border: '1.5px solid #EDE4D8',
          padding: '18px 16px',
          boxShadow: '0 2px 12px rgba(44,34,24,0.06)',
          display: 'flex', alignItems: 'center', gap: 16,
          transition: 'transform 0.13s, box-shadow 0.13s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 5px 20px rgba(44,34,24,0.10)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = ''
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(44,34,24,0.06)'
        }}
      >
        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: 16, flexShrink: 0,
          background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>
          {emoji}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700, fontSize: 15, color: '#2C2218',
            }}>
              {title}
            </p>
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700,
              color: badgeColor,
              background: `${badgeColor}18`,
              borderRadius: 999, padding: '2px 8px',
              textTransform: 'uppercase', letterSpacing: '0.04em',
              flexShrink: 0,
            }}>
              {badge}
            </span>
          </div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12, color: '#9A8878', lineHeight: 1.45,
          }}
          dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>

        {/* Arrow */}
        <span style={{ fontSize: 18, color: accent, flexShrink: 0 }}>→</span>
      </div>
    </Link>
  )
}
