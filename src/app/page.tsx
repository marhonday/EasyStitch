'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  const router = useRouter()

  return (
    <main style={{
      minHeight: '100vh',
      backgroundImage: 'url(/hero.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center top',
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
        <Image
          src="/header logo.png"
          alt="CraftWabi"
          width={200}
          height={60}
          style={{ objectFit: 'contain', height: 54, width: 'auto' }}
          priority
        />
      </header>

      {/* ── Hero tagline ────────────────────────────────────────────────────── */}
      <section style={{
        width: '100%', maxWidth: 440,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '24px 20px 16px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.20)',
          backdropFilter: 'blur(6px)',
          color: 'white',
          borderRadius: 999, padding: '6px 14px',
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
          marginBottom: 14,
          border: '1px solid rgba(255,255,255,0.30)',
        }}>
          Free · no account · no download needed
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 30, fontWeight: 700,
          color: 'white',
          lineHeight: 1.2,
          marginBottom: 10, maxWidth: 320,
          textShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}>
          Your all-in-one<br />
          <span style={{ color: '#AAEEAA' }}>crochet &amp; stitch studio.</span>
        </h1>

        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13, color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.65, maxWidth: 300,
          textShadow: '0 1px 6px rgba(0,0,0,0.25)',
        }}>
          Browse ready-made patterns, convert any photo into a stitch chart, or track a project row by row — all free.
        </p>
      </section>

      {/* ── 4 main paths ───────────────────────────────────────────────────── */}
      <section style={{ width: '100%', maxWidth: 440, padding: '4px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        <PathCard
          href="/shop"
          emoji="🛍️"
          title="Browse Ready-Made Patterns"
          description="Pre-gridded designs — football blankets, dog breeds, holidays &amp; more. Pick your size, add a name, download instantly."
          badge="Shop"
          badgeColor="#C4614A"
          accent="#C4614A"
        />

        <PathCard
          href="/create"
          emoji="📸"
          title="Convert Your Photo"
          description="Turn any photo into a C2C graphgan, cross-stitch chart, knitting colorwork, and more. Free, in seconds."
          badge="Free"
          badgeColor="#16a34a"
          accent="#2C7A4B"
        />

        <PathCard
          href="/track/upload"
          emoji="📋"
          title="Free Row Counter &amp; Tracker"
          description="Upload any pattern chart and follow it row by row with live colour guides. Free, no account needed."
          badge="Free"
          badgeColor="#7C5CBF"
          accent="#7C5CBF"
        />

        <PathCard
          href="/pbn"
          emoji="🎨"
          title="Paint by Number — $1"
          description="Turn any photo into a printable paint-by-number page. Numbered regions, clean outlines, instant download."
          badge="$1"
          badgeColor="#E8820C"
          accent="#E8820C"
        />

      </section>

      {/* ── Quick links row ───────────────────────────────────────────────── */}
      <section style={{ width: '100%', maxWidth: 440, padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
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
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(255,255,255,0.30)',
                borderRadius: 999,
                fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                color: 'white',
                cursor: 'pointer',
              }}
            >
              <span>{item.emoji}</span> {item.label}
            </button>
          ))}
        </div>
      </section>

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
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.6)',
          padding: '16px 16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', gap: 16,
          transition: 'transform 0.13s, box-shadow 0.13s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = ''
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)'
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26,
        }}>
          {emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, color: '#2C2218' }}>
              {title}
            </p>
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700,
              color: badgeColor, background: `${badgeColor}18`,
              borderRadius: 999, padding: '2px 8px',
              textTransform: 'uppercase' as const, letterSpacing: '0.04em', flexShrink: 0,
            }}>
              {badge}
            </span>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', lineHeight: 1.45 }}
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>

        <span style={{ fontSize: 18, color: accent, flexShrink: 0 }}>→</span>
      </div>
    </Link>
  )
}
