import Link from 'next/link'

export default function LandingPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px 24px', textAlign: 'center' }}>

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
          fontSize: 36, fontWeight: 700,
          color: '#2C2218', lineHeight: 1.2,
          marginBottom: 14, maxWidth: 320,
        }}>
          Turn any photo into<br />
          <span style={{ color: '#C4614A' }}>a crochet pattern.</span>
        </h1>

        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 15, color: '#6B5744',
          lineHeight: 1.65, maxWidth: 290,
          marginBottom: 32,
        }}>
          Upload a pet, portrait, or favourite memory — and get a colour-by-colour pattern to stitch, instantly.
        </p>

        {/* Sample grid card */}
        <div style={{
          width: '100%', maxWidth: 300,
          background: 'white', borderRadius: 24,
          boxShadow: '0 8px 32px rgba(44,34,24,0.10)',
          padding: 16, marginBottom: 32,
        }}>
          <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 12, background: '#F2EAD8', aspectRatio: '1' }}>
            <SamplePatternGrid />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#e8786e','#89a882','#c9a96e','#faf3e7','#5c7a55','#2a2118'].map(hex => (
                <div key={hex} style={{ width: 16, height: 16, borderRadius: '50%', background: hex, boxShadow: '0 1px 4px rgba(44,34,24,0.15)' }} />
              ))}
            </div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>20×20 · 6 colours</span>
          </div>
        </div>

        {/* How it works — 3 steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          {[['📷','Upload'],['🎨','Tune it'],['⬇','Stitch']].map(([icon, label], i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>{label}</span>
              </div>
              {i < 2 && <span style={{ color: '#C8BFB0', fontSize: 14 }}>→</span>}
            </div>
          ))}
        </div>

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C8BFB0', marginBottom: 8 }}>
          C2C · Tapestry · Graphgan · Works on any phone
        </p>

      </section>

      {/* Sticky CTA */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: 'linear-gradient(to bottom, transparent, #FAF6EF 35%)',
        padding: '20px 24px max(24px, env(safe-area-inset-bottom))',
      }}>
        <Link
          href="/upload"
          style={{
            display: 'block', width: '100%',
            padding: '17px 24px',
            background: '#C4614A', color: 'white',
            borderRadius: 16, textAlign: 'center',
            fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(196,97,74,0.30)',
          }}
        >
          Make My Pattern — Free →
        </Link>
        <p style={{
          textAlign: 'center', marginTop: 10,
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#B8AAA0',
        }}>
          No signup · PNG &amp; PDF export · keeps in session
        </p>
      </div>

    </main>
  )
}

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
