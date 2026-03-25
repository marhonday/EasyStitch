'use client'

/**
 * Step 1: Upload
 *
 * Enhancement now runs automatically as soon as a photo is selected —
 * no separate enhance step. User sees a subtle "cleaning up…" indicator
 * while it processes, then goes straight to Settings.
 *
 * This removes one full wizard step and makes enhancement feel like
 * a natural part of uploading rather than a confusing optional detour.
 */

import { useRouter } from 'next/navigation'
import { useState, useEffect }  from 'react'
import Header        from '@/components/layout/Header'
import { logEvent }  from '@/lib/log'
import StepIndicator from '@/components/ui/StepIndicator'
import BottomCTA     from '@/components/layout/BottomCTA'
import { usePattern } from '@/context/PatternContext'
import CropTool from '@/components/upload/CropTool'
import BgRemoval from '@/components/upload/BgRemoval'
import { analyzeImageWithVibrant } from '@/modules/image-processing/vibrant'

const MAX_RAW_BYTES = 8 * 1024 * 1024
const MAX_EDGE_PX   = 1600

/**
 * Count genuinely distinct colors in an image.
 * Samples a small canvas (64x64) and clusters pixels with ΔE threshold.
 * Returns how many distinct color groups exist, capped at maxColors.
 */

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

type LoadState = 'idle' | 'compressing' | 'enhancing' | 'ready' | 'error'

export default function UploadPage() {
  const router = useRouter()
  const { state, dispatch } = usePattern()
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [error,     setError]     = useState<string | null>(null)
  const [cropUrl,      setCropUrl]      = useState<string | null>(null)
  const [bgRemovalUrl, setBgRemovalUrl] = useState<string | null>(null)

  const hasPhoto = !!state.rawImage

  // [VISIT] — fires once when the upload/home page loads
  useEffect(() => { logEvent('VISIT') }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    logEvent('UPLOAD_STARTED')   // [UPLOAD_STARTED]
    setError(null)

    if (file.size > 50 * 1024 * 1024) {
      setError('That file is too large. Try a photo under 50 MB.')
      e.target.value = ''
      return
    }

    // Step 1: compress/normalise
    setLoadState('compressing')
    let dataUrl: string
    try {
      dataUrl = await compressImage(file)
    } catch {
      setError('Couldn\'t read that photo. Try a different one.')
      setLoadState('error')
      e.target.value = ''
      return
    }

    dispatch({ type: 'SET_RAW_IMAGE', payload: dataUrl })

    try {
      const analysis = await analyzeImageWithVibrant(dataUrl)
      dispatch({ type: 'SET_DETECTED_COLORS', payload: analysis.dominantCount })
      dispatch({ type: 'SET_DOMINANT_PALETTE', payload: analysis.dominantPalette })
      dispatch({ type: 'SET_RECOMMENDED_COLORS', payload: analysis.recommendedColors })
      dispatch({ type: 'UPDATE_SETTINGS', payload: { maxColors: analysis.recommendedColors } })
    } catch {
      // Palette analysis is best-effort; upload flow should continue regardless.
    }

    setLoadState('ready')
    setCropUrl(dataUrl)
  }

  async function handleCropConfirm(croppedUrl: string) {
    setCropUrl(null)
    setBgRemovalUrl(croppedUrl)
  }

  function handleBgAccept(resultUrl: string) {
    setBgRemovalUrl(null)
    dispatch({ type: 'SET_RAW_IMAGE', payload: resultUrl })
    setLoadState('ready')
  }

  function handleBgSkip() {
    const url = bgRemovalUrl!
    setBgRemovalUrl(null)
    dispatch({ type: 'SET_RAW_IMAGE', payload: url })
    setLoadState('ready')
  }

  function handleBgCancel() {
    // Cancel goes back to crop
    const url = bgRemovalUrl!
    setBgRemovalUrl(null)
    setCropUrl(url)
  }

  const statusMessage = {
    compressing: 'Reading photo…',
    enhancing:   'Cleaning up photo…',
    ready:       null,
    idle:        null,
    error:       null,
  }[loadState]

  const isLoading = loadState === 'compressing' || loadState === 'enhancing'

  // Show crop tool fullscreen
  if (cropUrl) {
    return (
      <main style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column' }}>
        <CropTool
          imageUrl={cropUrl}
          onConfirm={handleCropConfirm}
          onSkip={() => {
            setCropUrl(null)
            handleCropConfirm(cropUrl)
          }}
        />
      </main>
    )
  }

  // Show background removal screen after crop
  if (bgRemovalUrl) {
    return (
      <main style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column' }}>
        <BgRemoval
          imageUrl={bgRemovalUrl}
          onAccept={handleBgAccept}
          onCancel={handleBgCancel}
          onSkip={handleBgSkip}
        />
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>
      <Header />
      <StepIndicator />

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 20px 160px' }}>

        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center', marginBottom: 16 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#2C2218', marginBottom: 6 }}>
            {hasPhoto ? 'Looking good!' : 'Upload your photo'}
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.6 }}>
            {hasPhoto
              ? 'Your photo is ready. Tap below to set up your pattern.'
              : 'Pets, portraits, logos — anything with a clear subject works great.'}
          </p>
        </div>

        {/* Upload / preview area — compact */}
        <label
          htmlFor="photo-upload"
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
          {/* Photo thumbnail — compact row when selected */}
          {hasPhoto && !isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, padding: '12px 16px', boxShadow: '0 2px 12px rgba(44,34,24,0.08)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.enhancedImage ?? state.rawImage!}
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
                {state.enhancedImage && (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#4A9050', marginBottom: 4 }}>
                    ✨ Cleaned up automatically
                  </p>
                )}
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C8BFB0' }}>
                  Tap to swap photo
                </p>
              </div>
            </div>
          )}

          {/* Loading overlay */}
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
                animation: 'upload-spin 0.8s linear infinite',
              }} />
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>
                {statusMessage}
              </p>
            </div>
          )}

          {/* Empty state */}
          {!hasPhoto && !isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 32px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F2EAD8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                📷
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
          id="photo-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          onChange={handleFileChange}
          disabled={isLoading}
        />

        {/* Error */}
        {error && (
          <div style={{ marginTop: 10, width: '100%', maxWidth: 400, background: 'rgba(196,97,74,0.08)', borderRadius: 12, padding: '10px 16px' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A' }}>{error}</p>
          </div>
        )}

        {/* ── Below-the-fold info — always visible when no photo ── */}
        {!hasPhoto && !isLoading && (
          <div style={{ marginTop: 20, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* What photos work best */}
            <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                What works best
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { emoji: '🐶', label: 'Pets',       hint: 'Clear subject on plain background' },
                  { emoji: '🖼️', label: 'Portraits',  hint: 'Face or figure, well lit' },
                  { emoji: '🏷️', label: 'Logos',      hint: 'Use Graphic mode in settings' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#FAF6EF', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                    <span style={{ fontSize: 22, display: 'block', marginBottom: 4 }}>{item.emoji}</span>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, color: '#2C2218', marginBottom: 2 }}>{item.label}</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878', lineHeight: 1.3 }}>{item.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Tips for best results
              </p>
              {[
                ['☀️', 'Good lighting', 'Bright and even — avoid dark or backlit shots'],
                ['🎯', 'Fill the frame', 'Subject takes up most of the photo'],
                ['✂️', 'You can crop', 'We\'ll let you crop it after you choose'],
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

            {/* What you'll get */}
            <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                What you'll get
              </p>
              {[
                ['🎨', 'Tune colours & grid size', 'Set how detailed and how many colours'],
                ['📄', 'Full PDF instructions', 'Row-by-row steps, colour key, printable'],
                ['📋', 'Track your progress', 'Save and come back to your pattern anytime'],
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

          {/* Faith banner */}
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: '18px 20px',
            boxShadow: '0 1px 4px rgba(44,34,24,0.06)',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
          }}>
            {/* Cross SVG */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 52 }}>
              <svg width="32" height="40" viewBox="0 0 32 40" fill="none" aria-hidden>
                <rect x="13" y="0" width="6" height="40" rx="3" fill="#C4614A" opacity="0.45" />
                <rect x="0"  y="12" width="32" height="6" rx="3" fill="#C4614A" opacity="0.45" />
              </svg>
            </div>
            <div>
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 13,
                fontStyle: 'italic',
                color: '#6B5744',
                lineHeight: 1.7,
                marginBottom: 4,
              }}>
                &ldquo;Commit thy works unto the LORD, and thy thoughts shall be established.&rdquo;
              </p>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: '#C8BFB0',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Proverbs 16:3 &middot; KJV
              </p>
            </div>
          </div>

          </div>
        )}

      </section>

      <BottomCTA
        primaryLabel="Set Up My Pattern →"
        onPrimary={() => router.push('/settings')}
        primaryDisabled={!hasPhoto || isLoading}
      />

      <style>{`
        @keyframes upload-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
