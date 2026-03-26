'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import BottomCTA from '@/components/layout/BottomCTA'
import { useCrossStitch } from '@/context/CrossStitchPatternContext'

const MAX_EDGE_PX = 1600

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, MAX_EDGE_PX / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas unavailable'))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.88))
    }
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = url
  })
}

type LoadState = 'idle' | 'compressing' | 'ready' | 'error'

export default function CrossStitchUploadPage() {
  const router = useRouter()
  const { state, dispatch } = useCrossStitch()
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [error, setError] = useState<string | null>(null)

  const hasPhoto = !!state.rawImage
  const isLoading = loadState === 'compressing'

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (file.size > 50 * 1024 * 1024) {
      setError('That file is too large. Try a photo under 50 MB.')
      e.target.value = ''
      return
    }

    setLoadState('compressing')
    let dataUrl: string
    try {
      dataUrl = await compressImage(file)
    } catch {
      setError("Couldn't read that photo. Try a different one.")
      setLoadState('error')
      e.target.value = ''
      return
    }

    dispatch({ type: 'SET_IMAGE', payload: dataUrl })
    setLoadState('ready')
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>
      <Header />

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 20px 160px' }}>

        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center', marginBottom: 16 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#2C2218', marginBottom: 6 }}>
            Cross Stitch
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.6 }}>
            {hasPhoto
              ? 'Your photo is ready. Tap below to set up your cross stitch pattern.'
              : 'Upload a photo to create a symbol chart for Aida cloth embroidery.'}
          </p>
        </div>

        {/* Upload / preview area */}
        <label
          htmlFor="cs-photo-upload"
          style={{
            width: '100%', maxWidth: 400,
            height: hasPhoto ? 'auto' : 156,
            borderRadius: 20,
            border: hasPhoto ? 'none' : '2px dashed #E4D9C8',
            display: 'flex', flexDirection: hasPhoto ? 'row' : 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: isLoading ? 'wait' : 'pointer',
            overflow: 'hidden',
            background: hasPhoto ? 'transparent' : 'white',
            boxShadow: hasPhoto ? 'none' : '0 1px 6px rgba(44,34,24,0.05)',
            position: 'relative',
            gap: hasPhoto ? 14 : 0,
          }}
        >
          {hasPhoto && !isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, padding: '12px 16px', boxShadow: '0 2px 12px rgba(44,34,24,0.08)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.rawImage!}
                alt="Your photo"
                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12, flexShrink: 0, display: 'block' }}
              />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>✅</span>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218' }}>
                    Photo loaded
                  </p>
                </div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C8BFB0' }}>
                  Tap to swap photo
                </p>
              </div>
            </div>
          )}

          {isLoading && (
            <div style={{
              width: '100%', maxWidth: 400, height: 156,
              background: 'white', borderRadius: 20,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 12, boxShadow: '0 1px 6px rgba(44,34,24,0.05)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '3px solid #E4D9C8',
                borderTopColor: '#C4614A',
                animation: 'cs-spin 0.8s linear infinite',
              }} />
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>
                Reading photo…
              </p>
            </div>
          )}

          {!hasPhoto && !isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 32px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F2EAD8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                🪡
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: '#2C2218' }}>
                Tap to choose a photo
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>
                JPG, PNG or HEIC · Camera roll or files
              </p>
            </div>
          )}
        </label>

        <input
          id="cs-photo-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          onChange={handleFileChange}
          disabled={isLoading}
        />

        {error && (
          <div style={{ marginTop: 10, width: '100%', maxWidth: 400, background: 'rgba(196,97,74,0.08)', borderRadius: 12, padding: '10px 16px' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A' }}>{error}</p>
          </div>
        )}

        {!hasPhoto && !isLoading && (
          <div style={{ marginTop: 20, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* What is cross stitch */}
            <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                What is cross stitch?
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', lineHeight: 1.6 }}>
                Cross stitch is embroidery on Aida cloth — a square grid fabric. Each X-shaped stitch fills one square. Symbols distinguish colours so charts are readable even in black and white. Perfect for portraits, landscapes, and personalised gifts.
              </p>
            </div>

            {/* Feature highlights */}
            <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                What you get
              </p>
              {[
                ['🪡', 'Symbol chart', 'Each colour gets a unique symbol — readable even in B&W'],
                ['📏', 'Aida sizing', 'See exact finished inches at 14, 18, or 28-count Aida'],
                ['🎨', 'Up to 32 colours', 'Full photo-realistic detail or bold simplified designs'],
              ].map(([emoji, title, desc]) => (
                <div key={title as string} style={{ display: 'flex', gap: 10, paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid #F2EAD8' }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{emoji}</span>
                  <div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#2C2218' }}>{title}</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </section>

      <BottomCTA
        primaryLabel="Set Up My Chart →"
        onPrimary={() => router.push('/crossstitch/settings')}
        primaryDisabled={!hasPhoto || isLoading}
      />

      <style>{`
        @keyframes cs-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
