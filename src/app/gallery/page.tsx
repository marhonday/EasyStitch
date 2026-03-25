'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'

/**
 * Community Gallery
 *
 * Shows before → after examples of real patterns made with EasyStitch.
 * Kept separate from the main wizard flow — users land here from the
 * About and Donate pages, not from the home screen.
 *
 * To add a real entry: add an object to the GALLERY array.
 * Images should be placed in /public/gallery/ and referenced as '/gallery/filename.jpg'
 */

interface GalleryEntry {
  id:          string
  title:       string
  description: string
  beforeSrc:   string   // original photo
  afterSrc:    string   // pattern screenshot / finished blanket photo
  colors:      number
  gridSize:    string
  stitchStyle: string
  submittedBy?: string
}

// ── Add real entries here as photos come in ──────────────────────────────────
const GALLERY: GalleryEntry[] = [
  // Example entry — replace src values with real images placed in /public/gallery/
  // {
  //   id: 'golden-retriever',
  //   title: 'Golden Retriever',
  //   description: 'A 65×80 throw blanket from a phone photo taken in the backyard.',
  //   beforeSrc: '/gallery/golden-before.jpg',
  //   afterSrc:  '/gallery/golden-after.jpg',
  //   colors: 8,
  //   gridSize: '65×80',
  //   stitchStyle: 'Single Crochet',
  //   submittedBy: 'Sarah M.',
  // },
]

const COMING_SOON_SLOTS = 6   // placeholder cards shown while gallery is empty

export default function GalleryPage() {
  const router = useRouter()
  const hasEntries = GALLERY.length > 0

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>

      <Header />

      <div style={{ flex: 1, padding: '8px 20px 60px', maxWidth: 480, margin: '0 auto', width: '100%' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🖼️</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
            Community Gallery
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', lineHeight: 1.7, maxWidth: 300, margin: '0 auto' }}>
            Real photos turned into real blankets by real crocheters. Photo → pattern → finished project.
          </p>
        </div>

        {/* Submit CTA */}
        <div style={{ background: 'rgba(196,97,74,0.06)', border: '1.5px dashed rgba(196,97,74,0.25)', borderRadius: 16, padding: '16px 18px', marginBottom: 28, textAlign: 'center' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: '#C4614A', marginBottom: 6 }}>
            Made something with EasyStitch?
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', lineHeight: 1.7, marginBottom: 12 }}>
            We&apos;d love to feature your finished project here. Send us your original photo and a photo of the finished blanket and we&apos;ll add you to the gallery.
          </p>
          <a
            href="mailto:Support@easystitch.org?subject=Gallery%20Submission&body=Hi!%20I%20made%20a%20blanket%20with%20EasyStitch%20and%20I%27d%20love%20to%20be%20in%20the%20gallery.%20Attaching%20my%20original%20photo%20and%20finished%20project%20photo."
            style={{
              display: 'inline-block',
              padding: '11px 22px',
              background: '#C4614A', color: 'white',
              borderRadius: 12, fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
              boxShadow: '0 3px 12px rgba(196,97,74,0.25)',
            }}
          >
            📧 Submit your project
          </a>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#B8AAA0', marginTop: 8 }}>
            Support@easystitch.org
          </p>
        </div>

        {/* Gallery grid */}
        {hasEntries ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {GALLERY.map(entry => (
              <div key={entry.id} style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(44,34,24,0.08)' }}>
                {/* Before → After photos */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{ position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.beforeSrc} alt={`${entry.title} — original photo`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '2px 7px' }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'white', fontWeight: 600 }}>Photo</span>
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.afterSrc} alt={`${entry.title} — finished blanket`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(196,97,74,0.85)', borderRadius: 6, padding: '2px 7px' }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'white', fontWeight: 600 }}>Finished</span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div style={{ padding: '14px 16px' }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#2C2218', marginBottom: 4 }}>
                    {entry.title}
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', marginBottom: 10 }}>
                    {entry.description}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      `${entry.colors} colours`,
                      entry.gridSize,
                      entry.stitchStyle,
                    ].map(tag => (
                      <span key={tag} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#C4614A', background: 'rgba(196,97,74,0.08)', borderRadius: 8, padding: '3px 9px' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  {entry.submittedBy && (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', marginTop: 8 }}>
                      Made by {entry.submittedBy}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Placeholder grid while gallery fills up */
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#C8BFB0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14, textAlign: 'center' }}>
              First entries coming soon
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {Array.from({ length: COMING_SOON_SLOTS }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: 'white', borderRadius: 16,
                    aspectRatio: '1', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 1px 6px rgba(44,34,24,0.06)',
                    border: '1.5px dashed #E8DDD0',
                  }}
                >
                  <span style={{ fontSize: 28, opacity: 0.35 }}>🧶</span>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', textAlign: 'center', padding: '0 10px' }}>
                    Your project could be here
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 32 }}>
          <button
            onClick={() => router.push('/upload')}
            style={{ width: '100%', padding: '14px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(196,97,74,0.25)' }}
          >
            + Make My Pattern
          </button>
          <button
            onClick={() => router.push('/about')}
            style={{ width: '100%', padding: '13px', background: 'white', color: '#6B5744', border: '1.5px solid #E4D9C8', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: 'pointer' }}
          >
            About EasyStitch
          </button>
        </div>
      </div>
    </main>
  )
}
