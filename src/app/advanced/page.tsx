'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'

/**
 * Advanced / Graph-Only route — placeholder.
 * Full route will be built out as a streamlined upload → graph → download flow
 * with no row instructions, no progress tracking, focused on clean grid output.
 */
export default function AdvancedPage() {
  const router = useRouter()

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <section style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>📐</div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28, fontWeight: 700, color: '#2C2218',
          marginBottom: 12,
        }}>
          Graph Only
        </h1>

        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14, color: '#6B5744',
          lineHeight: 1.7, maxWidth: 300, marginBottom: 32,
        }}>
          The streamlined route for experienced crocheters — upload your photo and get a clean graph, sized your way.
        </p>

        <div style={{
          background: 'white', borderRadius: 16,
          border: '1.5px solid #E4D9C8',
          padding: '16px 20px', maxWidth: 320, width: '100%',
          marginBottom: 32,
        }}>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12, fontWeight: 700, color: '#C4614A',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
          }}>
            Coming in this route
          </p>
          {[
            ['📷', 'Upload your photo'],
            ['📏', 'Set your grid dimensions'],
            ['🎨', 'Choose colour count'],
            ['⬇', 'Download your graph — PNG or PDF'],
          ].map(([icon, label]) => (
            <div key={label as string} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: '1px solid #F2EAD8',
            }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218' }}>{label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none', border: 'none',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13, color: '#9A8878',
            cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          ← Back to path selection
        </button>
      </section>
    </main>
  )
}
