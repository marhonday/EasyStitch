'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'

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
  const router     = useRouter()
  const hasEntries = GALLERY.length > 0

  const [creatorName,   setCreatorName]   = useState('')
  const [projectNote,   setProjectNote]   = useState('')
  const [originalThumb, setOriginalThumb] = useState<string | null>(null)
  const [finishedThumb, setFinishedThumb] = useState<string | null>(null)
  const [submitted,     setSubmitted]     = useState(false)

  const originalInputRef = useRef<HTMLInputElement>(null)
  const finishedInputRef = useRef<HTMLInputElement>(null)

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handlePhotoSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string | null) => void
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await readAsDataUrl(file)
    setter(url)
    e.target.value = ''
  }

  function handleSubmit() {
    const subject  = encodeURIComponent('EasyStitch Gallery Submission')
    const nameLine = creatorName ? `Name: ${creatorName}\n` : ''
    const noteLine = projectNote ? `About my project: ${projectNote}\n` : ''
    const body     = encodeURIComponent(
      `Hi EasyStitch team!\n\nI'd love to be featured in the gallery.\n\n${nameLine}${noteLine}\nI'm attaching my original photo and a photo of my finished blanket.\n\n— ${creatorName || 'A happy stitcher'}`
    )
    window.open(`mailto:Support@easystitch.org?subject=${subject}&body=${body}`)
    setSubmitted(true)
  }

  const canSubmit = originalThumb || finishedThumb || creatorName

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', padding: '16px 20px 10px', gap: 12 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(44,34,24,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'rgba(44,34,24,0.75)', fontWeight: 600, flex: 1, textAlign: 'center' }}>Gallery</span>
        <div style={{ width: 60 }} />
      </header>

      <div style={{ flex: 1, padding: '8px 20px 60px', maxWidth: 480, margin: '0 auto', width: '100%' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🖼️</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
            Community Gallery
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', lineHeight: 1.7, maxWidth: 300, margin: '0 auto' }}>
            Photos turned into blankets — by your fellow EasyStitch crocheters.
          </p>
        </div>

        {/* Show Your Creation card */}
        {!submitted ? (
          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.08)', overflow: 'hidden', marginBottom: 28 }}>

            {/* Card header */}
            <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #F2EAD8' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🧶</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 700, color: '#2C2218', marginBottom: 4 }}>
                Show us your creation!
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', lineHeight: 1.6 }}>
                Finished a blanket with EasyStitch? We&apos;d love to feature it here — original photo + finished project.
              </p>
            </div>

            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Photo upload row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

                {/* Original photo */}
                <div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', marginBottom: 6 }}>Original photo</p>
                  <div
                    onClick={() => originalInputRef.current?.click()}
                    style={{
                      aspectRatio: '1', borderRadius: 14, overflow: 'hidden',
                      border: originalThumb ? 'none' : '2px dashed #E4D9C8',
                      background: originalThumb ? 'transparent' : '#FAF6EF',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', position: 'relative',
                    }}
                  >
                    {originalThumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={originalThumb} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ textAlign: 'center', padding: 12 }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>Tap to add</p>
                      </div>
                    )}
                    {originalThumb && (
                      <div style={{ position: 'absolute', bottom: 5, right: 5, background: 'rgba(44,34,24,0.6)', borderRadius: 8, padding: '2px 7px' }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'white' }}>Change</span>
                      </div>
                    )}
                  </div>
                  <input ref={originalInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoSelect(e, setOriginalThumb)} />
                </div>

                {/* Finished project */}
                <div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', marginBottom: 6 }}>Finished project</p>
                  <div
                    onClick={() => finishedInputRef.current?.click()}
                    style={{
                      aspectRatio: '1', borderRadius: 14, overflow: 'hidden',
                      border: finishedThumb ? 'none' : '2px dashed #E4D9C8',
                      background: finishedThumb ? 'transparent' : '#FAF6EF',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', position: 'relative',
                    }}
                  >
                    {finishedThumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={finishedThumb} alt="Finished" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ textAlign: 'center', padding: 12 }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>🏆</div>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>Tap to add</p>
                      </div>
                    )}
                    {finishedThumb && (
                      <div style={{ position: 'absolute', bottom: 5, right: 5, background: 'rgba(196,97,74,0.75)', borderRadius: 8, padding: '2px 7px' }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'white' }}>Change</span>
                      </div>
                    )}
                  </div>
                  <input ref={finishedInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoSelect(e, setFinishedThumb)} />
                </div>

              </div>

              {/* Name input */}
              <input
                value={creatorName}
                onChange={e => setCreatorName(e.target.value)}
                placeholder="Your name (optional)"
                style={{
                  width: '100%', padding: '11px 14px',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#2C2218',
                  background: '#FAF6EF', border: '1.5px solid #E4D9C8',
                  borderRadius: 12, outline: 'none', boxSizing: 'border-box',
                }}
              />

              {/* Note */}
              <textarea
                value={projectNote}
                onChange={e => setProjectNote(e.target.value)}
                placeholder="Tell us about your project — what size, who it's for, any tips… (optional)"
                rows={3}
                style={{
                  width: '100%', padding: '11px 14px',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218',
                  background: '#FAF6EF', border: '1.5px solid #E4D9C8',
                  borderRadius: 12, outline: 'none', resize: 'none',
                  boxSizing: 'border-box', lineHeight: 1.5,
                }}
              />

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  width: '100%', padding: '14px',
                  background: canSubmit ? '#C4614A' : '#E4D9C8',
                  color: canSubmit ? 'white' : '#B8AAA0',
                  border: 'none', borderRadius: 14,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed',
                  boxShadow: canSubmit ? '0 4px 16px rgba(196,97,74,0.22)' : 'none',
                }}
              >
                📧 Send to EasyStitch
              </button>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', textAlign: 'center', marginTop: -6 }}>
                Opens your email — attach the photos and hit send
              </p>

            </div>
          </div>

        ) : (
          /* Submitted state */
          <div style={{ background: 'rgba(74,144,80,0.07)', border: '1.5px solid rgba(74,144,80,0.2)', borderRadius: 20, padding: '20px 18px', marginBottom: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: '#2C2218', marginBottom: 6 }}>
              Thanks for sharing!
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', lineHeight: 1.6 }}>
              Attach your photos in the email and send it over — we&apos;ll add you to the gallery.
            </p>
          </div>
        )}

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
