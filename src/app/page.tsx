import Link from 'next/link'

export default function LandingPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px 48px', textAlign: 'center' }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(196,97,74,0.10)', color: '#C4614A',
          borderRadius: 999, padding: '6px 14px',
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
          marginBottom: 20,
        }}>
          🧶 100% free · no account needed
        </div>

        {/* Headline */}
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
          fontSize: 14, color: '#6B5744',
          lineHeight: 1.65, maxWidth: 290,
          marginBottom: 28,
        }}>
          Upload a pet, portrait, or favourite memory — and get a colour-by-colour pattern to stitch, instantly.
        </p>

        {/* Sample grid card */}
        <div style={{
          width: '100%', maxWidth: 240,
          background: 'white', borderRadius: 18,
          boxShadow: '0 4px 20px rgba(44,34,24,0.09)',
          padding: 12, marginBottom: 36,
        }}>
          <div style={{ borderRadius: 12, overflow: 'hidden', background: '#F2EAD8', aspectRatio: '1' }}>
            <SamplePatternGrid />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 2px 0' }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {['#e8786e','#89a882','#c9a96e','#faf3e7','#5c7a55','#2a2118'].map(hex => (
                <div key={hex} style={{ width: 12, height: 12, borderRadius: '50%', background: hex, boxShadow: '0 1px 3px rgba(44,34,24,0.15)' }} />
              ))}
            </div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>20×20 · 6 colours</span>
          </div>
        </div>

        {/* ── BEGINNER PATH ──────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 28 }}>

          <div style={{ textAlign: 'left', marginBottom: 10 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Guided — beginner friendly
            </p>
          </div>

          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'white', borderRadius: 20,
              border: '2px solid #C4614A',
              padding: '18px 20px',
              boxShadow: '0 4px 16px rgba(196,97,74,0.12)',
              display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: 'rgba(196,97,74,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>
                🧶
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: '#2C2218', marginBottom: 6 }}>
                  Guided Pattern
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', lineHeight: 1.6, marginBottom: 10 }}>
                  Row-by-row instructions, progress tracking, and a full colour key — everything you need from start to finish.
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['Single crochet', 'C2C', 'Tapestry', 'Mosaic'].map(tag => (
                    <span key={tag} style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                      color: '#9A8878', background: '#F5F0E8',
                      borderRadius: 999, padding: '3px 10px',
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* ── ADVANCED GRAPHS ────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 28 }}>

          <div style={{ textAlign: 'left', marginBottom: 10 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#6B5744', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Graph only — advanced
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', marginTop: 2 }}>
              Clean graph to work from your own way — no hand-holding.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

            {/* Crochet Graph */}
            <Link href="/advanced" style={{ textDecoration: 'none' }}>
              <GraphCard
                icon="📐"
                title="Crochet Graph"
                tags={['C2C', 'SC', 'Tapestry', 'Mosaic']}
              />
            </Link>

            {/* Knitting Graph */}
            <Link href="/knitting" style={{ textDecoration: 'none' }}>
              <GraphCard
                icon="🧵"
                title="Knitting Graph"
                tags={['Fair Isle', 'Intarsia']}
                badge="New"
              />
            </Link>

            {/* Filet Crochet — coming soon */}
            <GraphCard
              icon="🔲"
              title="Filet Crochet"
              tags={['Open mesh', 'Filled grid']}
              comingSoon
            />

            {/* Cross Stitch — coming soon */}
            <GraphCard
              icon="✚"
              title="Cross Stitch"
              tags={['Embroidery', 'Aida cloth']}
              comingSoon
            />

          </div>
        </div>

        {/* ── DIAMOND PAINTING ───────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 8 }}>

          <div style={{ textAlign: 'left', marginBottom: 10 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#B8AAA0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Coming soon
            </p>
          </div>

          <div style={{
            background: '#FAFAFA', borderRadius: 20,
            border: '1.5px solid #EDE8E0',
            padding: '18px 20px',
            display: 'flex', gap: 16, alignItems: 'flex-start',
            opacity: 0.55,
            cursor: 'not-allowed',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: '#F0EBE2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>
              💎
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: '#2C2218', marginBottom: 6 }}>
                Diamond Painting
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', lineHeight: 1.6 }}>
                Convert any photo into a diamond painting grid with colour codes and bead counts.
              </p>
            </div>
          </div>

        </div>

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C8BFB0', marginTop: 16 }}>
          No signup · works on any phone · free to start
        </p>

      </section>

    </main>
  )
}

// ── Shared graph card component ──────────────────────────────────────────────

function GraphCard({
  icon, title, tags, badge, comingSoon,
}: {
  icon: string
  title: string
  tags: string[]
  badge?: string
  comingSoon?: boolean
}) {
  return (
    <div style={{
      background: comingSoon ? '#FAFAFA' : 'white',
      borderRadius: 16,
      border: comingSoon ? '1.5px solid #EDE8E0' : '1.5px solid #E4D9C8',
      padding: '14px 12px',
      boxShadow: comingSoon ? 'none' : '0 2px 8px rgba(44,34,24,0.05)',
      opacity: comingSoon ? 0.5 : 1,
      cursor: comingSoon ? 'not-allowed' : 'pointer',
      height: '100%',
      boxSizing: 'border-box' as const,
    }}>
      <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' as const }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: comingSoon ? '#9A8878' : '#2C2218' }}>
          {title}
        </p>
        {badge && (
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700,
            color: '#C4614A', background: 'rgba(196,97,74,0.10)',
            borderRadius: 999, padding: '2px 7px', textTransform: 'uppercase' as const, letterSpacing: '0.04em',
          }}>
            {badge}
          </span>
        )}
        {comingSoon && (
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700,
            color: '#B8AAA0', background: '#EDE8E0',
            borderRadius: 999, padding: '2px 7px', textTransform: 'uppercase' as const, letterSpacing: '0.04em',
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
          }}>{tag}</span>
        ))}
      </div>
    </div>
  )
}

// ── Sample pattern grid ──────────────────────────────────────────────────────

function SamplePatternGrid() {
  const palette = ['#e8786e','#89a882','#c9a96e','#faf3e7','#5c7a55','#2a2118']
  const size = 14
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, 1fr)`, gap: 1, padding: 8, width: '100%', height: '100%', boxSizing: 'border-box' }}>
      {Array.from({ length: size * size }).map((_, i) => {
        const row = Math.floor(i / size)
        const col = i % size
        const colorIndex = Math.abs(Math.sin(row * 1.3 + col * 0.9) * palette.length | 0) % palette.length
        return (
          <div
            key={i}
            style={{ aspectRatio: '1', borderRadius: 2, background: palette[colorIndex] }}
          />
        )
      })}
    </div>
  )
}
